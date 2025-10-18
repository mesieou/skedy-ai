import { BusinessToolsRepository } from '../../shared/lib/database/repositories/business-tools-repository';
import { sentry } from '../../shared/utils/sentryService';
import { PERMANENT_TOOLS } from '../../shared/lib/database/types/tools';
import { updateDynamicTool } from './updateDynamicTool';
import type { Session } from '../sessions/session';
import assert from 'assert';

/**
 * Update session tools (for AI requests or initial setup)
 */
export async function updateToolsToSession(session: Session, toolNames: string[], serviceName?: string): Promise<void> {
  assert(session && session.id, 'updateToolsToSession: session must have an id');
  assert(session.businessId, 'updateToolsToSession: session must have a businessId');
  assert(Array.isArray(toolNames) && toolNames.length > 0, 'updateToolsToSession: toolNames must be a non-empty array');

  const startTime = Date.now();

  try {
    console.log(`🔧 [UpdateTools] Session ${session.id} | Updating tools...`);
    console.log(`📋 [UpdateTools] Requested tool names:`, toolNames);
    console.log(`📋 [UpdateTools] Permanent tools:`, PERMANENT_TOOLS);
    console.log(`📋 [UpdateTools] All available tools in session:`, session.allAvailableToolNames);

    // Add breadcrumb
    sentry.addBreadcrumb(`Updating session tools`, 'tool-management', {
      sessionId: session.id,
      businessId: session.businessId,
      requestedTools: toolNames
    });

    // Validate session has all available tool names loaded
    assert(session.allAvailableToolNames && session.allAvailableToolNames.length > 0, 'Session must have allAvailableToolNames loaded before updating tools');

    // Always include permanent tools + requested tools
    const allToolNames = [...PERMANENT_TOOLS, ...toolNames];
    console.log(`📋 [UpdateTools] Combined tool names (permanent + requested):`, allToolNames);

    // Filter to only valid ones
    const validToolNames = allToolNames.filter(name => session.allAvailableToolNames.includes(name));
    const invalidTools = allToolNames.filter(name => !session.allAvailableToolNames.includes(name));

    console.log(`✅ [UpdateTools] Valid tool names:`, validToolNames);
    if (invalidTools.length > 0) {
      console.warn(`⚠️ [UpdateTools] Invalid tools requested: ${invalidTools.join(', ')}`);
    }

    if (validToolNames.length === 0) {
      console.warn(`⚠️ [UpdateTools] No valid tools to add from: ${allToolNames.join(', ')}`);
      return;
    }

    // Get tools from database using business_tools junction table
    console.log(`🔍 [UpdateTools] Fetching tool definitions from database for business ${session.businessId}...`);
    const businessToolsRepo = new BusinessToolsRepository();
    const allValidTools = await businessToolsRepo.getActiveToolsByNamesForBusiness(session.businessId, validToolNames);
    console.log(`✅ [UpdateTools] Fetched ${allValidTools.length} tool definitions:`, allValidTools.map(t => t.name));

    // Update dynamic tool schemas if needed
    if (serviceName && toolNames.includes('get_quote')) {
      // Find get_quote tool and update its schema
      const getQuoteTool = allValidTools.find(t => t.name === 'get_quote');
      if (getQuoteTool && getQuoteTool.function_schema) {
        getQuoteTool.function_schema = await updateDynamicTool(getQuoteTool.function_schema, session.businessId, serviceName);
        console.log(`🔧 [UpdateTools] Updated get_quote schema for service: ${serviceName}`);
      }
    }

    // Update session tools
    session.currentTools = allValidTools;
    console.log(`💾 [UpdateTools] Session tools updated in memory`);
    console.log(`📋 [UpdateTools] Current tools now in session:`, session.currentTools.map(t => t.name));

    const duration = Date.now() - startTime;
    console.log(`✅ [UpdateTools] Updated ${allValidTools.length} tools (${duration}ms): ${allValidTools.map(t => t.name).join(', ')}`);

    // Success breadcrumb
    sentry.addBreadcrumb(`Tools updated successfully`, 'tool-management', {
      sessionId: session.id,
      businessId: session.businessId,
      setTools: allValidTools.map(t => t.name),
      totalTools: session.currentTools.length,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [SessionTools] Failed to update tools in session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'update_tools_session',
      metadata: {
        requestedTools: toolNames,
        duration
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
