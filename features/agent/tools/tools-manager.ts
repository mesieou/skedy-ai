/**
 * Tools Manager
 *
 * Thin orchestrator for AI function calling.
 * Single responsibility: Route function calls to appropriate domain services.
 * Does NOT manage state, business logic, or database operations.
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Business } from '../../shared/lib/database/types/business';
import type { Service } from '../../shared/lib/database/types/service';
import type { CallContextManager } from '../memory/call-context-manager';
import type {
  FunctionCallResult,
  QuoteFunctionArgs,
  ServiceSelectionFunctionArgs,
  CheckDayAvailabilityFunctionArgs,
  CreateUserFunctionArgs,
  CreateBookingFunctionArgs,
  ToolSchema
} from './types';
import { QuoteTool } from './scheduling/quote';
import { ServiceSelectionTool } from './scheduling/service-selection';
import { UserManagementTool } from './scheduling/user-management';
import { BookingManagementTool } from './scheduling/booking-management';
import { AvailabilityCheckTool } from './scheduling/availability-check';
import { SchemaManager } from './schema-generator';
import { createToolError } from '../../shared/utils/error-utils';

export class ToolsManager {
  private readonly businessContext: BusinessContext;
  private readonly business: Business;
  private readonly callContextManager: CallContextManager;

  // Domain service tools (stateless)
  private readonly quoteTool: QuoteTool;
  private readonly serviceSelectionTool: ServiceSelectionTool;
  private readonly userManagementTool: UserManagementTool;
  private readonly bookingManagementTool: BookingManagementTool;
  private readonly availabilityCheckTool: AvailabilityCheckTool;

  // State for dynamic schema generation (ONLY for selected service)
  private selectedService: Service | null = null;

  constructor(businessContext: BusinessContext, business: Business, callContextManager: CallContextManager) {
    this.businessContext = businessContext;
    this.business = business;
    this.callContextManager = callContextManager;

    // Initialize domain tools with proper dependencies
    this.quoteTool = new QuoteTool(businessContext, business, callContextManager);
    this.serviceSelectionTool = new ServiceSelectionTool(businessContext);
    this.userManagementTool = new UserManagementTool(callContextManager);
    this.bookingManagementTool = new BookingManagementTool();
    this.availabilityCheckTool = new AvailabilityCheckTool(business);
  }

  /**
   * Get static OpenAI tools array for this business
   * Returns only static schemas (service selection)
   */
  getStaticToolsForAI(): ToolSchema[] {
    return SchemaManager.getAllStaticSchemas(this.businessContext);
  }

  /**
   * Execute a function call from the AI - thin orchestration layer
   */
  async executeFunction(
    functionName: string,
    args: QuoteFunctionArgs | ServiceSelectionFunctionArgs | CheckDayAvailabilityFunctionArgs | CreateUserFunctionArgs | CreateBookingFunctionArgs,
    callId?: string
  ): Promise<FunctionCallResult> {

    console.log('🤖 [ToolsManager] OpenAI function call received:');
    console.log(`   🎯 Function: ${functionName}`);
    console.log(`   📋 Arguments:`, JSON.stringify(args, null, 2));

    const startTime = Date.now();

    // Simple delegation to domain tools - track service selection for dynamic schema
    switch (functionName) {
      case 'select_service':
        console.log('   🔄 Executing service selection...');
        const selectionResult = this.serviceSelectionTool.processServiceSelectionForAI(args as ServiceSelectionFunctionArgs);

        // Store selected service in call context for other tools to access
        if (selectionResult.success && callId) {
          const service = this.serviceSelectionTool.findServiceByName((args as ServiceSelectionFunctionArgs).service_name);
          if (service) {
            await this.callContextManager.setSelectedService(callId, service);
            this.selectedService = service; // Keep local copy for schema generation
            console.log(`   ✅ Service selected: ${service.name}`);
            console.log(`   📋 Service requirements: [${service.ai_function_requirements?.join(', ') || 'none'}]`);
          }
        }
        this.logFunctionResult('select_service', selectionResult, startTime);
        return selectionResult;

      case 'get_quote':
        console.log('   💰 Executing quote calculation...');
        if (!callId) {
          return createToolError("Missing call context", "Quote calculation requires call context.");
        }
        const quoteResult = await this.quoteTool.getQuoteForSelectedService(args as QuoteFunctionArgs, callId);
        this.logFunctionResult('get_quote', quoteResult, startTime);
        return quoteResult;

      case 'check_day_availability':
        console.log('   📅 Checking availability...');
        const availabilityResult = await this.availabilityCheckTool.checkDayAvailability(args as CheckDayAvailabilityFunctionArgs);
        this.logFunctionResult('check_day_availability', availabilityResult, startTime);
        return availabilityResult;

      case 'check_user_exists':
        console.log('   👤 Checking if user exists...');
        const userExistsResult = await this.userManagementTool.checkUserExists((args as { phone_number: string }).phone_number, this.business.id);
        this.logFunctionResult('check_user_exists', userExistsResult, startTime);
        return userExistsResult;

      case 'create_user':
        console.log('   👤 Creating user...');
        const userResult = await this.userManagementTool.createUser(args as CreateUserFunctionArgs, this.business.id, callId);
        this.logFunctionResult('create_user', userResult, startTime);
        return userResult;

      case 'create_booking':
        console.log('   📝 Creating booking...');
        const bookingResult = await this.bookingManagementTool.createBooking(args as CreateBookingFunctionArgs, this.business);
        this.logFunctionResult('create_booking', bookingResult, startTime);
        return bookingResult;

      default:
        const errorResult = createToolError(
          "Unknown function",
          `Sorry, I don't know how to handle: ${functionName}`
        );
        this.logFunctionResult(functionName, errorResult, startTime);
        return errorResult;
    }
  }

  /**
   * Get available function names for this business
   */
  getAvailableFunctions(): string[] {
    return this.getStaticToolsForAI().map(tool => tool.name);
  }

  /**
   * Check if a function is available for this business
   */
  hasFunction(functionName: string): boolean {
    return this.getAvailableFunctions().includes(functionName);
  }

  /**
   * Generate dynamic quote schema for the selected service
   * This is dynamic because it depends on service's ai_function_requirements and ai_job_scope_options
   */
  getQuoteSchemaForSelectedService(): ToolSchema | null {
    // We need to track selected service for dynamic quote schema generation
    // This is the ONLY dynamic schema - all others are static
    const selectedService = this.getSelectedServiceFromContext();

    if (!selectedService) {
      return null;
    }

    return SchemaManager.generateServiceSpecificQuoteSchema(
      selectedService,
      this.businessContext.businessInfo
    );
  }

  /**
   * Get selected service (for dynamic quote schema)
   */
  private getSelectedServiceFromContext(): Service | null {
    return this.selectedService;
  }

  /**
   * Clear selected service (for cleanup)
   */
  clearSelectedService(): void {
    this.selectedService = null;
    console.log('🧹 Cleared selected service');
  }

  /**
   * Log function execution results for OpenAI interaction tracking
   */
  private logFunctionResult(functionName: string, result: FunctionCallResult, startTime: number): void {
    const executionTime = Date.now() - startTime;

    console.log(`🏁 [ToolsManager] Function execution completed:`);
    console.log(`   🎯 Function: ${functionName}`);
    console.log(`   ⏱️  Execution time: ${executionTime}ms`);
    console.log(`   ${result.success ? '✅' : '❌'} Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   💬 Message: ${result.message}`);

    if (result.data) {
      console.log(`   📊 Data returned:`, JSON.stringify(result.data, null, 2));
    }

    if (!result.success && result.error) {
      console.log(`   ⚠️  Error details: ${result.error}`);
    }

    console.log('📤 [ToolsManager] Complete function result payload for OpenAI:');
    console.log(JSON.stringify(result, null, 2));
  }

}
