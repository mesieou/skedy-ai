/**
 * AI Agent Tools
 *
 * Simplified tool system with instance-based approach for better testability
 * Generates dynamic function schemas and executes function calls
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { ToolSchema, ToolConfig, QuoteFunctionArgs, FunctionCallResult } from './types';
import { RequirementsEngine } from './requirements-engine';
import { FunctionExecutor } from './function-executor';

export class AITools {
  private businessContext: BusinessContext;
  private requirementsEngine: RequirementsEngine;
  private functionExecutor: FunctionExecutor;
  private config: ToolConfig;

  constructor(businessContext: BusinessContext, config?: Partial<ToolConfig>) {
    this.businessContext = businessContext;
    this.requirementsEngine = new RequirementsEngine(businessContext.businessInfo);
    this.functionExecutor = new FunctionExecutor(businessContext);
    this.config = {
      enableMultiService: true,
      enableEscalation: true,
      enableBooking: true,
      ...config
    };
  }

  /**
   * Generate all function schemas for this business context
   */
  generateToolSchemas(): ToolSchema[] {
    const tools: ToolSchema[] = [];

    // Core tools (no quote requirements - directly use get_quote)

    if (this.config.enableBooking) {
      tools.push(this.getMakeBookingSchema());
    }

    if (this.config.enableEscalation) {
      tools.push(...this.getEscalationSchemas());
    }

    // Dynamic quote schemas for each service
    this.businessContext.services.forEach(service => {
      const schema = this.requirementsEngine.generateSchema(service);
      tools.push(schema);
    });

    // Multi-service schema if enabled and multiple services exist
    if (this.config.enableMultiService && this.businessContext.services.length > 1) {
      const multiServiceSchema = this.requirementsEngine.generateMultiServiceSchema(
        this.businessContext.services
      );
      tools.push(multiServiceSchema);
    }

    // Add any custom schemas
    if (this.config.customSchemas) {
      tools.push(...this.config.customSchemas);
    }

    return tools;
  }

  /**
   * Execute function call based on function name and arguments
   */
  async executeFunction(functionName: string, args: Record<string, string | number | boolean | string[]>): Promise<FunctionCallResult> {
    switch (functionName) {
      case 'get_quote':
        return this.functionExecutor.executeGetQuote(args as QuoteFunctionArgs);

      case 'get_multi_service_quote':
        return this.functionExecutor.executeMultiServiceQuote(args as QuoteFunctionArgs);

      case 'make_booking':
        return this.functionExecutor.executeMakeBooking(args as { booking_id: string; confirmed_datetime: string; deposit_payment_method?: string });

      case 'get_customer_info_for_escalation':
        return this.functionExecutor.executeGetCustomerInfo(args as { customer_name: string; customer_phone?: string; issue_description: string });

      case 'escalate_conversation':
        return this.functionExecutor.executeEscalation(args as { reason: string });

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  /**
   * Get available services for this business
   */
  getAvailableServices(): Array<{id: string; name: string}> {
    return this.businessContext.services.map(s => ({
      id: s.id,
      name: s.name
    }));
  }

  /**
   * Check if multi-service quotes are supported
   */
  supportsMultiService(): boolean {
    return this.config.enableMultiService && this.businessContext.services.length > 1;
  }



  private getMakeBookingSchema(): ToolSchema {
    return {
      type: "function",
      function: {
        name: "make_booking",
        description: "Confirm a PENDING booking (change status to confirmed)",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            booking_id: {
              type: "string",
              description: "ID of the pending booking to confirm"
            },
            confirmed_datetime: {
              type: "string",
              description: "Final confirmed date and time"
            },
            deposit_payment_method: {
              type: "string",
              description: "Payment method for deposit",
              enum: ["credit_card", "bank_transfer", "cash", "paypal"]
            }
          },
          required: ["booking_id", "confirmed_datetime"],
          additionalProperties: false
        }
      }
    };
  }

  private getEscalationSchemas(): ToolSchema[] {
    return [
      {
        type: "function",
        function: {
          name: "get_customer_info_for_escalation",
          description: "Collect customer details before escalation",
          strict: true,
          parameters: {
            type: "object",
            properties: {
              customer_name: { type: "string", description: "Customer name" },
              customer_phone: { type: "string", description: "Customer phone" },
              issue_description: { type: "string", description: "Issue description" }
            },
            required: ["customer_name", "issue_description"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "escalate_conversation",
          description: "Transfer to human agent",
          strict: true,
          parameters: {
            type: "object",
            properties: {
              reason: { type: "string", description: "Escalation reason" }
            },
            required: ["reason"],
            additionalProperties: false
          }
        }
      }
    ];
  }
}
