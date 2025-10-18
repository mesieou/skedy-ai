import type { Session } from '../sessions/session';
import type { QuoteRequestData } from '../../scheduling/lib/types/booking-domain';
import { buildToolResponse } from './helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import assert from 'assert';

// Import tool functions
import { getServiceDetails } from './tools/getServiceDetails';
import { getQuote } from './tools/getQuote';
import { selectQuote } from './tools/selectQuote';
import { checkDayAvailability } from './tools/checkDayAvailability';
import { createUser } from './tools/createUser';
import { createAndSendPaymentLink } from './tools/createAndSendPaymentLink';
import { checkPaymentStatusTool } from './tools/checkPaymentStatus';
import { sendSMSBookingConfirmationTool } from './tools/sendSMSBookingConfirmationTool';
import { createBooking } from './tools/createBooking';
import { requestTool } from './tools/requestTool';
import { getAdditionalInfo } from './tools/getAdditionalInfo';

// MWAV Integration tools
import { collectLocationDetails } from '../integrations/mwav/tools/collectLocationDetails';
import { searchMovingItems } from '../integrations/mwav/tools/searchMovingItems';
import { addMovingItems } from '../integrations/mwav/tools/addMovingItems';
import { collectCustomerDetails } from '../integrations/mwav/tools/collectCustomerDetails';
import { collectDateTime } from '../integrations/mwav/tools/collectDateTime';
import { sendEnquiryConfirmation } from '../integrations/mwav/tools/sendEnquiryConfirmation';
import { getMWAVQuote } from '../integrations/mwav/tools/getMWAVQuote';
import { sendMWAVEnquiry } from '../integrations/mwav/tools/sendMWAVEnquiry';

/**
 * Execute tool function and update session state
 */
export async function executeToolFunction(
  toolName: string,
  args: Record<string, unknown>,
  session: Session
): Promise<Record<string, unknown>> {
  assert(toolName && typeof toolName === 'string', 'executeToolFunction: toolName must be a non-empty string');
  assert(args && typeof args === 'object', 'executeToolFunction: args must be an object');
  assert(session && session.id, 'executeToolFunction: session must have an id');
  assert(session.businessId, 'executeToolFunction: session must have a businessId');

  const startTime = Date.now();

  try {
    console.log(`🔧 [ExecuteTool] Starting execution for: ${toolName}`);
    console.log(`📋 [ExecuteTool] Session ${session.id} | Current tools in session:`, session.currentTools?.map(t => t.name) || []);
    console.log(`📋 [ExecuteTool] Session ${session.id} | All available tools:`, session.allAvailableToolNames || []);
    console.log(`📥 [ExecuteTool] Tool ${toolName} | Input args:`, JSON.stringify(args, null, 2));

    // Add breadcrumb for tool execution start
    sentry.addBreadcrumb(`Executing tool ${toolName}`, 'tool-execution', {
      sessionId: session.id,
      businessId: session.businessId,
      toolName: toolName,
      currentToolsCount: session.currentTools?.length || 0,
      argsKeys: Object.keys(args)
    });

    // Find the tool in currently available tools
    const tool = session.currentTools?.find(t => t.name === toolName);
    if (!tool) {
      console.error(`❌ [ExecuteTool] Tool NOT FOUND: ${toolName}`);
      console.error(`❌ [ExecuteTool] Current tools: ${JSON.stringify(session.currentTools?.map(t => t.name))}`);
      console.error(`❌ [ExecuteTool] All available: ${JSON.stringify(session.allAvailableToolNames)}`);

      const errorResult = {
        success: false,
        error: `${toolName} unavailable`,
        message: "Tool not currently available. Use 'request_tool' to request additional tools."
      };

      // Track tool not found error
      sentry.trackError(new Error(`Tool not found: ${toolName}`), {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'tool_execution_not_found',
        metadata: {
          toolName: toolName,
          currentTools: session.currentTools?.map(t => t.name) || [],
          allAvailableTools: session.allAvailableToolNames
        }
      });

      console.log(`📤 [ExecuteTool] Returning error result:`, errorResult);
      return errorResult;
    }

    console.log(`✅ [ExecuteTool] Tool found in currentTools: ${toolName}`);

    let result: Record<string, unknown>;

    // Execute tool
    switch (toolName) {
      case 'get_service_details':
        result = await getServiceDetails(args as { service_name: string }, session);
        break;
      case 'get_quote':
        result = await getQuote(args as unknown as QuoteRequestData & { service_id: string }, session);
        break;
      case 'select_quote':
        result = await selectQuote(args as { quote_id: string }, session);
        break;
      case 'check_day_availability':
        result = await checkDayAvailability(
          args as { date: string; quote_total_estimate_time_minutes: number; selected_quote_id: string },
          session
        );
        break;
      case 'create_user':
        result = await createUser(
          args as { first_name: string; last_name?: string; mobile_number: string },
          session
        );
        break;
      case 'create_and_send_payment_link':
        result = await createAndSendPaymentLink(
          args as { preferred_date: string; preferred_time: string; user_id: string, selected_quote_id: string },
          session
        );
        break;
      case 'check_payment_status':
        result = await checkPaymentStatusTool(session);
        break;
      case 'create_booking':
        result = await createBooking(
          args as { preferred_date: string; preferred_time: string; quote_id: string; confirmation_message?: string; payment_confirmation: string },
          session
        );
        break;
      case 'request_tool':
        result = await requestTool(args as { tool_name: string; service_name?: string; reason?: string }, session);
        break;
      case 'send_sms_booking_confirmation':
        result = await sendSMSBookingConfirmationTool(
          args as { preferred_date: string; preferred_time: string; confirmation_message?: string },
          session
        );
        break;
      case 'collect_location_details':
        result = await collectLocationDetails(
          args as { location_type: 'pickup' | 'dropoff'; address: string; parking_distance: string; stairs_count: string; has_lift: boolean },
          session
        );
        break;
      case 'search_moving_items':
        result = await searchMovingItems(
          args as { items_description: string },
          session
        );
        break;
      case 'add_moving_items':
        result = await addMovingItems(
          args as { items: Array<{ item_name: string; quantity: number; pickup_index: number; dropoff_index: number; notes?: string }> },
          session
        );
        break;
      case 'collect_customer_details':
        result = await collectCustomerDetails(
          args as { first_name: string; last_name: string; phone: string; email: string },
          session
        );
        break;
      case 'collect_date_time':
        result = await collectDateTime(
          args as { preferred_date: string; time_preference: 'morning' | 'afternoon' },
          session
        );
        break;
      case 'send_enquiry_confirmation':
        result = await sendEnquiryConfirmation(
          args as { send_via: 'sms' | 'email' | 'both' },
          session
        );
        break;
      case 'get_mwav_quote':
        result = await getMWAVQuote(
          args as { confirm_locations_collected: string; confirm_items_collected: string; confirm_customer_details: string; confirm_date_time: string },
          session
        );
        break;
      case 'send_mwav_enquiry':
        result = await sendMWAVEnquiry(
          args as { customer_confirmation: string; confirmation_message?: string },
          session
        );
        break;
      case 'get_additional_info':
        result = await getAdditionalInfo(
          args as { question: string },
          session
        );
        break;
      default:
        result = buildToolResponse(null, `Unknown tool: ${toolName}`, false);

        // Track unknown tool error
        sentry.trackError(new Error(`function called from Unknown tool: ${toolName}`), {
          sessionId: session.id,
          businessId: session.businessId,
          operation: 'tool_execution_unknown',
        metadata: {
          toolName: toolName,
          currentTools: session.currentTools?.map(t => t.name) || []
        }
        });
    }

    const duration = Date.now() - startTime;

    console.log(`📤 [ExecuteTool] Tool ${toolName} | Output result:`, JSON.stringify(result, null, 2));
    console.log(`⏱️ [ExecuteTool] Tool ${toolName} | Execution time: ${duration}ms`);

    // Add success breadcrumb
    sentry.addBreadcrumb(`Tool execution completed successfully`, 'tool-execution', {
      sessionId: session.id,
      toolName: toolName,
      duration: duration,
      resultSuccess: (result as { success?: boolean }).success !== false
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Track tool execution error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_execution_error',
      metadata: {
        toolName: toolName,
        duration: duration,
        currentToolsCount: session.currentTools?.length || 0,
        argsKeys: Object.keys(args),
        errorName: (error as Error).name
      }
    });

    throw error;
  }
}
