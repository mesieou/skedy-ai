/**
 * Tools Manager
 *
 * Complete AI tools system - generates schemas and executes functions
 * Single responsibility: Manage all AI function calling for a business
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Business } from '../../shared/lib/database/types/business';
import type { Service } from '../../shared/lib/database/types/service';
import type { FunctionCallResult, QuoteFunctionArgs, ServiceSelectionFunctionArgs, ToolSchema } from './types';
import { QuoteTool } from './scheduling/quote';
import { ServiceSelectionTool } from './scheduling/service-selection';
import { SchemaManager } from './schema-generator';

export class ToolsManager {
  private businessContext: BusinessContext;
  private business: Business;
  private quoteTool: QuoteTool;
  private serviceSelectionTool: ServiceSelectionTool;
  private selectedService: Service | null = null; // State management for selected service

  constructor(businessContext: BusinessContext, business: Business) {
    this.businessContext = businessContext;
    this.business = business;
    this.quoteTool = new QuoteTool(businessContext, business);
    this.serviceSelectionTool = new ServiceSelectionTool(businessContext);
  }

  /**
   * Get static OpenAI tools array for this business
   * Returns only static schemas (service selection)
   */
  getStaticToolsForAI(): ToolSchema[] {
    return SchemaManager.getAllStaticSchemas(this.businessContext);
  }

  /**
   * Execute a function call from the AI
   */
  async executeFunction(functionName: string, args: QuoteFunctionArgs | ServiceSelectionFunctionArgs): Promise<FunctionCallResult> {
    console.log(`🔧 Executing function: ${functionName}`);

    switch (functionName) {
      case 'select_service':
        const selectionArgs = args as ServiceSelectionFunctionArgs;
        const result = this.serviceSelectionTool.selectService(selectionArgs);

        // If service selection was successful, store the selected service
        if (result.success && selectionArgs.service_name) {
          this.selectedService = this.serviceSelectionTool.getServiceByName(selectionArgs.service_name);
        }

        return result;

      case 'get_quote':
        // Check if service is selected first
        if (!this.selectedService) {
          return this.createErrorResult(
            "No service selected",
            "Please select a service first before requesting a quote."
          );
        }
        return this.quoteTool.getQuoteForSelectedService(this.selectedService, args as QuoteFunctionArgs);

      // Future functions:
      // case 'check_availability':
      //   return this.availabilityTool.checkAvailability(args);
      // case 'make_booking':
      //   return this.bookingTool.makeBooking(args);

      default:
        return this.createErrorResult(
          "Unknown function",
          `Sorry, I don't know how to handle: ${functionName}`
        );
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
   * Get the currently selected service
   */
  getSelectedService(): Service | null {
    return this.selectedService;
  }

  /**
   * Generate dynamic quote schema for the selected service
   */
  getQuoteSchemaForSelectedService(): ToolSchema | null {
    if (!this.selectedService) {
      return null;
    }

    return SchemaManager.generateServiceSpecificQuoteSchema(
      this.selectedService,
      this.businessContext.businessInfo
    );
  }

  /**
   * Clear selected service (for cleanup)
   */
  clearSelectedService(): void {
    this.selectedService = null;
    console.log('🧹 Cleared selected service');
  }

  private createErrorResult(error: string, message: string): FunctionCallResult {
    return { success: false, error, message };
  }
}
