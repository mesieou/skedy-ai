import { ToolsRepository } from '../../shared/lib/database/repositories/tools-repository';
import { sentry } from '../../shared/utils/sentryService';
import { PERMANENT_TOOLS } from '../../shared/lib/database/types/tools';
import { updateDynamicTool } from './updateDynamicTool';
import type { Session } from '../sessions/session';
import assert from 'assert';

/**
 * Add specific tools to session (for AI requests or initial setup)
 */
export async function updateToolsToSession(session: Session, toolNames: string[], serviceName?: string): Promise<void> {
  assert(session && session.id, 'addToolsToSession: session must have an id');
  assert(session.businessId, 'addToolsToSession: session must have a businessId');
  assert(Array.isArray(toolNames) && toolNames.length > 0, 'addToolsToSession: toolNames must be a non-empty array');

  const startTime = Date.now();

  try {
    // Add breadcrumb
    sentry.addBreadcrumb(`Adding tools to session`, 'tool-management', {
      sessionId: session.id,
      businessId: session.businessId,
      requestedTools: toolNames
    });

    // Validate session has all available tool names loaded
    assert(session.allAvailableToolNames && session.allAvailableToolNames.length > 0, 'Session must have allAvailableToolNames loaded before adding tools');

    // Always include permanent tools + requested tools
    const allToolNames = [...PERMANENT_TOOLS, ...toolNames];

    // Filter to only valid ones
    const validToolNames = allToolNames.filter(name => session.allAvailableToolNames.includes(name));
    const invalidTools = allToolNames.filter(name => !session.allAvailableToolNames.includes(name));

    if (invalidTools.length > 0) {
      console.warn(`⚠️ [SessionTools] Invalid tools requested: ${invalidTools.join(', ')}`);
    }

    if (validToolNames.length === 0) {
      console.warn(`⚠️ [SessionTools] No valid tools to add from: ${allToolNames.join(', ')}`);
      return;
    }

    // Get tools from database
    const toolRepo = new ToolsRepository();
    const allValidTools = await toolRepo.findAll({}, {
      business_id: session.businessId,
      is_active: true,
      name: validToolNames
    });

    // Update dynamic tool schemas if needed
    if (serviceName && toolNames.includes('get_quote')) {
      // Find get_quote tool and update its schema
      const getQuoteTool = allValidTools.find(t => t.name === 'get_quote');
      if (getQuoteTool && getQuoteTool.function_schema) {
        getQuoteTool.function_schema = await updateDynamicTool(getQuoteTool.function_schema, session.businessId, serviceName);
        console.log(`🔧 [UpdateTools] Updated get_quote schema for service: ${serviceName}`);
      }
    }

    // Add tools to session
    session.currentTools = allValidTools;

    const duration = Date.now() - startTime;
    console.log(`✅ [SessionTools] Set ${allValidTools.length} tools (${duration}ms): ${allValidTools.map(t => t.name).join(', ')}`);

    // Success breadcrumb
    sentry.addBreadcrumb(`Tools set successfully`, 'tool-management', {
      sessionId: session.id,
      businessId: session.businessId,
      setTools: allValidTools.map(t => t.name),
      totalTools: session.currentTools.length,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [SessionTools] Failed to add tools to session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'add_tools_to_session',
      metadata: {
        requestedTools: toolNames,
        duration
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
