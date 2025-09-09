/**
 * MVP Tools Manager - Optimized Function Calling
 *
 * Manages both core booking functions and new knowledge functions
 * with business-aware multi-tenancy and simplified architecture
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Business } from '../../shared/lib/database/types/business';
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

// Import existing tools
import { QuoteTool } from './scheduling/quote';
import { ServiceSelectionTool } from './scheduling/service-selection';
import { UserManagementTool } from './scheduling/user-management';
import { BookingManagementTool } from './scheduling/booking-management';
import { AvailabilityCheckTool } from './scheduling/availability-check';
import { QuoteSelectionTool } from './scheduling/quote-selection';

// Import new knowledge tools
import { BusinessFaqsTool } from './knowledge/business-faqs';
import { ServicesPricingTool } from './knowledge/services-pricing';
import { BusinessInformationTool } from './knowledge/business-information';
import { ObjectionHandlingTool } from './knowledge/objection-handling';

// Import MVP schema manager
import { MVPSchemaManager } from './mvp-schema-generator';
import { createToolError } from '../../shared/utils/error-utils';

// ============================================================================
// KNOWLEDGE FUNCTION ARGUMENT TYPES
// ============================================================================

interface GetObjectionHandlingArgs {
  objection_type: 'price' | 'spouse_approval' | 'service_fit' | 'hesitation';
}

interface EscalateConversationArgs {
  reason?: string;
}

interface SelectQuoteFunctionArgs {
  quote_choice?: string;
}

// ============================================================================
// MVP TOOLS MANAGER CLASS
// ============================================================================

export class MVPToolsManager {
  private readonly businessContext: BusinessContext;
  private readonly business: Business;
  private readonly callContextManager: CallContextManager;
  private readonly callId: string;
  private readonly businessId: string;

  // Core booking tools (existing)
  private readonly quoteTool: QuoteTool;
  private readonly serviceSelectionTool: ServiceSelectionTool;
  private readonly userManagementTool: UserManagementTool;
  private readonly bookingManagementTool: BookingManagementTool;
  private readonly availabilityCheckTool: AvailabilityCheckTool;
  private readonly quoteSelectionTool: QuoteSelectionTool;

  // Knowledge tools (reorganized for clarity)
  private readonly servicesPricingTool: ServicesPricingTool;
  private readonly businessInformationTool: BusinessInformationTool;
  private readonly generalFaqsTool: BusinessFaqsTool; // Renamed for clarity
  private readonly objectionHandlingTool: ObjectionHandlingTool;

  // No local state - everything goes through Redis

  constructor(
    businessContext: BusinessContext,
    business: Business,
    callContextManager: CallContextManager,
    callId: string
  ) {
    this.businessContext = businessContext;
    this.business = business;
    this.callContextManager = callContextManager;
    this.callId = callId;
    this.businessId = business.id;

    // Initialize core booking tools
    this.quoteTool = new QuoteTool(businessContext, business, callContextManager);
    this.serviceSelectionTool = new ServiceSelectionTool(businessContext);
    this.userManagementTool = new UserManagementTool(callContextManager);
    this.bookingManagementTool = new BookingManagementTool(callContextManager);
    this.availabilityCheckTool = new AvailabilityCheckTool(business, callContextManager);
    this.quoteSelectionTool = new QuoteSelectionTool(callContextManager);

    // Initialize knowledge tools with business-specific callId
    this.servicesPricingTool = new ServicesPricingTool(this.callId);
    this.businessInformationTool = new BusinessInformationTool(this.callId);
    this.generalFaqsTool = new BusinessFaqsTool(this.callId); // Handles general FAQs
    this.objectionHandlingTool = new ObjectionHandlingTool(this.callId);

    console.log(`🔧 [MVP Tools] Initialized for business: ${business.name} (${this.businessId})`);
    console.log(`🎯 [MVP Tools] Call: ${this.callId}`);
  }

  // ============================================================================
  // FUNCTION EXECUTION ROUTER
  // ============================================================================

  async executeFunction(functionName: string, args: Record<string, unknown>): Promise<FunctionCallResult> {
    const startTime = Date.now();
    console.log(`🔧 [MVP Tools] Executing: ${functionName}`, Object.keys(args));

    try {
      let result: FunctionCallResult;

      // Route to appropriate function category
      if (this.isCoreBookingFunction(functionName)) {
        result = await this.executeCoreBookingFunction(functionName, args);
      } else if (this.isKnowledgeFunction(functionName)) {
        result = await this.executeKnowledgeFunction(functionName, args);
      } else if (this.isObjectionHandlingFunction(functionName)) {
        result = await this.executeObjectionHandlingFunction(functionName, args);
      } else {
        result = createToolError(
          "Unknown function",
          `Function '${functionName}' is not available for this business.`
        );
      }

      this.logFunctionResult(functionName, result, startTime);
      return result;

    } catch (error) {
      const errorResult = createToolError(
        "Function execution failed",
        `Error executing ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      this.logFunctionResult(functionName, errorResult, startTime);
      return errorResult;
    }
  }

  // ============================================================================
  // CORE BOOKING FUNCTION EXECUTION
  // ============================================================================

  private async executeCoreBookingFunction(functionName: string, args: Record<string, unknown>): Promise<FunctionCallResult> {
    switch (functionName) {
      case 'select_service':
        const selectionArgs = args as unknown as ServiceSelectionFunctionArgs;
        const selectionResult = this.serviceSelectionTool.processServiceSelectionForAI(selectionArgs);
        await this.storeSelectedService(selectionResult);
        return selectionResult;

      case 'get_quote':
        const quoteArgs = args as unknown as QuoteFunctionArgs;
        return await this.quoteTool.getQuoteForSelectedService(quoteArgs, this.callId);

      case 'select_quote':
        const selectQuoteArgs = args as unknown as SelectQuoteFunctionArgs;
        return await this.quoteSelectionTool.selectQuote(selectQuoteArgs, this.callId);

      case 'check_day_availability':
        const availabilityArgs = args as unknown as CheckDayAvailabilityFunctionArgs;
        return await this.availabilityCheckTool.checkDayAvailability(availabilityArgs, this.callId);

      case 'check_user_exists':
        const userExistsArgs = args as { phone_number: string };
        return await this.userManagementTool.checkUserExists(
          userExistsArgs.phone_number,
          this.businessId
        );

      case 'create_user':
        const createUserArgs = args as unknown as CreateUserFunctionArgs;
        return await this.userManagementTool.createUser(
          createUserArgs,
          this.businessId,
          this.callId
        );

      case 'create_booking':
        const createBookingArgs = args as unknown as CreateBookingFunctionArgs;
        return await this.bookingManagementTool.createBooking(
          createBookingArgs,
          this.business,
          this.callId
        );

      default:
        return createToolError("Unknown core function", `Core function '${functionName}' not implemented`);
    }
  }

  // ============================================================================
  // KNOWLEDGE FUNCTION EXECUTION (Customer Info Questions)
  // ============================================================================

  private async executeKnowledgeFunction(functionName: string, args: Record<string, unknown>): Promise<FunctionCallResult> {
    switch (functionName) {
      case 'get_services_pricing_info':
        const pricingArgs = args as unknown as { service_name?: string };
        return await this.servicesPricingTool.getServicesPricingInfo(pricingArgs);

      case 'get_business_information':
        const businessArgs = args as unknown as { query?: string };
        return await this.businessInformationTool.getBusinessInformation(businessArgs);

      case 'get_general_faqs':
        const faqsArgs = args as unknown as { query?: string };
        return await this.generalFaqsTool.getGeneralFaqs(faqsArgs);

      case 'escalate_conversation':
        return this.handleEscalation(args as EscalateConversationArgs);

      default:
        return createToolError("Unknown knowledge function", `Knowledge function '${functionName}' not implemented`);
    }
  }

  // ============================================================================
  // OBJECTION HANDLING EXECUTION (Sales Tactics)
  // ============================================================================

  private async executeObjectionHandlingFunction(functionName: string, args: Record<string, unknown>): Promise<FunctionCallResult> {
    switch (functionName) {
      case 'get_objection_handling_guidance':
        const objectionArgs = args as unknown as GetObjectionHandlingArgs;
        return await this.objectionHandlingTool.getObjectionHandlingGuidance(objectionArgs);

      default:
        return createToolError("Unknown objection function", `Objection handling function '${functionName}' not implemented`);
    }
  }

  // ============================================================================
  // SCHEMA MANAGEMENT
  // ============================================================================

  getStaticToolsForAI(): ToolSchema[] {
    const schemas = MVPSchemaManager.getAllStaticSchemas(this.businessContext);
    MVPSchemaManager.logSchemasSummary(schemas);
    return schemas;
  }

  async getDynamicQuoteSchema(): Promise<ToolSchema | null> {
    // Get selected service from Redis, not local memory
    const selectedService = await this.callContextManager.getSelectedService(this.callId);
    if (!selectedService) {
      return null;
    }
    return MVPSchemaManager.generateServiceSpecificQuoteSchema(selectedService);
  }

  getQuoteSelectionSchema(): ToolSchema | null {
    // Only available when multiple quotes exist
    return MVPSchemaManager.getQuoteSelectionSchema();
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  private async storeSelectedService(selectionResult: FunctionCallResult): Promise<void> {
    if (selectionResult.success && selectionResult.data && typeof selectionResult.data === 'object') {
      const serviceName = (selectionResult.data as { selected_service?: string }).selected_service;
      if (serviceName) {
        // Find the full service object
        const serviceObject = this.businessContext.services.find(s => s.name === serviceName);
        if (serviceObject) {
          // Store ONLY in Redis - no local memory
          try {
            console.log(`🔄 [MVP Tools] Storing service in context: ${serviceObject.name}`);
            const contextStartTime = Date.now();

            // Store only the essential data - tools are computed dynamically
            await this.callContextManager.updateCallState(this.callId, {
              selectedService: serviceObject
            });

            const contextTime = Date.now() - contextStartTime;
            console.log(`🔄 [MVP Tools] Context storage took: ${contextTime}ms`);
            console.log(`✅ [MVP Tools] Service stored: ${serviceName}`);
          } catch (error) {
            console.error(`❌ [MVP Tools] Failed to store service:`, error);
          }
        } else {
          console.error(`❌ [MVP Tools] Service not found in business context: ${serviceName}`);
        }
      }
    }
  }


  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private isCoreBookingFunction(functionName: string): boolean {
    return [
      'select_service',
      'get_quote',
      'select_quote',
      'check_day_availability',
      'check_user_exists',
      'create_user',
      'create_booking'
    ].includes(functionName);
  }

  private isKnowledgeFunction(functionName: string): boolean {
    return [
      'get_services_pricing_info',
      'get_business_information',
      'get_general_faqs',
      'escalate_conversation'
    ].includes(functionName);
  }

  private isObjectionHandlingFunction(functionName: string): boolean {
    return [
      'get_objection_handling_guidance'
    ].includes(functionName);
  }

  private handleEscalation(args: EscalateConversationArgs): FunctionCallResult {
    const reason = args.reason || 'Customer requested human assistance';

    console.log(`🚨 [MVP Tools] Escalation requested: ${reason}`);

    // TODO: Implement actual escalation logic
    // - Notify human agents
    // - Transfer call
    // - Update call status

    return {
      success: true,
      message: "I'm connecting you with one of our team members who can help you better. Please hold on for just a moment.",
      data: {
        escalation_reason: reason,
        escalation_time: new Date().toISOString(),
        call_id: this.callId,
        business_id: this.businessId
      }
    };
  }

  private logFunctionResult(functionName: string, result: FunctionCallResult, startTime: number): void {
    const duration = Date.now() - startTime;
    const status = result.success ? '✅' : '❌';

    let category = 'UNKNOWN';
    if (this.isCoreBookingFunction(functionName)) {
      category = 'CORE';
    } else if (this.isKnowledgeFunction(functionName)) {
      category = 'KNOWLEDGE';
    } else if (this.isObjectionHandlingFunction(functionName)) {
      category = 'OBJECTION';
    }

    console.log(`${status} [MVP Tools] ${category} ${functionName} (${duration}ms): ${result.message || 'No message'}`);

    if (!result.success && result.error) {
      console.error(`   Error: ${result.error}`);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getAvailableFunctions(): string[] {
    return [
      // Core booking functions (main flow)
      'select_service',
      'get_quote',
      'select_quote',
      'check_day_availability',
      'check_user_exists',
      'create_user',
      'create_booking',
      // Knowledge functions (customer info questions)
      'get_services_pricing_info',
      'get_business_information',
      'get_general_faqs',
      'escalate_conversation',
      // Objection handling (sales tactics)
      'get_objection_handling_guidance'
    ];
  }

  hasFunction(functionName: string): boolean {
    return this.getAvailableFunctions().includes(functionName);
  }

  getBusinessContext(): BusinessContext {
    return this.businessContext;
  }

  getCallId(): string {
    return this.callId;
  }

  getBusinessId(): string {
    return this.businessId;
  }
}
