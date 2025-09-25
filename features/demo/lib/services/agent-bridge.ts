import * as Sentry from '@sentry/nextjs';

/**
 * Bridge between demo frontend and agent backend
 * Uses API calls to avoid server-side imports in client code
 */
export class AgentBridge {

  /**
   * Execute a tool using the agent backend system via API
   */
  static async executeTool(
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    console.log(`🔧 [AgentBridge] BEFORE - Executing ${toolName} for session ${sessionId}`, {
      sessionId,
      toolName,
      args,
      url: '/api/demo-tool-execution'
    });

    // Add breadcrumb for tool execution start
    Sentry.addBreadcrumb({
      message: 'Demo tool bridge execution',
      category: 'demo-bridge',
      data: {
        sessionId: sessionId,
        toolName: toolName,
        argsKeys: Object.keys(args)
      }
    });

    try {
      const response = await fetch('/api/demo-tool-execution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          toolName,
          args
        })
      });

      console.log(`📡 [AgentBridge] Response received:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [AgentBridge] HTTP Error:`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });

        // Track HTTP error in Sentry
        Sentry.captureException(new Error(`Tool execution HTTP error: ${response.status}`), {
          tags: {
            operation: 'demo_bridge_http_error',
            sessionId: sessionId,
            toolName: toolName
          },
          extra: {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            errorText: errorText
          }
        });

        throw new Error(`Tool execution failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      console.log(`📤 [AgentBridge] Response data:`, data);

      if (!data.success) {
        throw new Error(data.error || 'Tool execution failed');
      }

      console.log(`✅ [AgentBridge] AFTER - Tool ${toolName} executed successfully`);
      return data.result;

    } catch (error) {
      console.error(`❌ [AgentBridge] Tool execution error:`, {
        sessionId,
        toolName,
        error: error,
        errorMessage: (error as Error).message
      });

      // Track error in Sentry
      Sentry.captureException(error, {
        tags: {
          operation: 'demo_bridge_tool_execution',
          sessionId: sessionId,
          toolName: toolName
        },
        extra: {
          argsKeys: Object.keys(args)
        }
      });

      throw error;
    }
  }
}
