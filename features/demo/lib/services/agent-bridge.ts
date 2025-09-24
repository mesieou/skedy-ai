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
      throw error;
    }
  }
}
