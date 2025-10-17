import { OnboardingSession, OnboardingStatus } from '../types/onboarding-session';
import { OnboardingSessionService } from './onboarding-session-service';
import { WebsiteAnalyzerService } from './website-analyzer-service';
import { getStepByStatus, getNextStep } from '../constants/onboarding-steps';
import OpenAI from 'openai';

/**
 * Onboarding Agent Service
 * Handles AI-powered conversational onboarding
 * 
 * This is the "brain" of the onboarding flow - it manages the conversation,
 * calls tools, and guides users through setup
 */
export class OnboardingAgentService {
  private openai: OpenAI;
  private websiteAnalyzer: WebsiteAnalyzerService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 360000, // 6 minutes (longer than MCP 5-minute timeout)
      maxRetries: 2
    });
    this.websiteAnalyzer = new WebsiteAnalyzerService();
  }

  /**
   * Process user message and generate AI response
   * This is the main entry point for chat interactions
   */
  async processMessage(
    sessionId: string,
    userMessage: string
  ): Promise<{
    message: string;
    session: OnboardingSession;
    toolCalls?: Array<{ name: string; result: unknown }>;
  }> {
    console.log(`💬 [OnboardingAgent] Processing message for session: ${sessionId}`);

    // Get session
    const session = await OnboardingSessionService.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Add user message to interactions
    await OnboardingSessionService.addInteraction(
      sessionId,
      'user',
      userMessage,
      { step: session.status }
    );

    // Get current step configuration
    const currentStep = getStepByStatus(session.status);
    if (!currentStep) {
      throw new Error(`Invalid session status: ${session.status}`);
    }

    // Build conversation context
    const messages = this.buildConversationContext(session, currentStep.aiPrompt || '');

    // Add user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Define available tools for this step
    const tools = this.getToolsForStep(session.status);

    try {
      // Call OpenAI with tools
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 1000
      });

      const assistantMessage = response.choices[0]?.message;
      const toolCalls: Array<{ name: string; result: unknown }> = [];

      // Handle tool calls
      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(`🔧 [OnboardingAgent] Processing ${assistantMessage.tool_calls.length} tool calls`);

        for (const toolCall of assistantMessage.tool_calls) {
          // Type guard: only process function tool calls
          if (toolCall.type !== 'function') {
            console.warn(`⚠️ [OnboardingAgent] Skipping non-function tool call: ${toolCall.type}`);
            continue;
          }

          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          console.log(`🔧 [OnboardingAgent] Executing tool: ${toolName}`, toolArgs);

          const toolResult = await this.executeTool(
            session,
            toolName,
            toolArgs
          );

          toolCalls.push({ name: toolName, result: toolResult });
        }

        // Get final response after tool execution
        const finalResponse = await this.generateResponseAfterTools(
          session,
          messages,
          assistantMessage,
          toolCalls
        );

        // Add assistant message to interactions
        await OnboardingSessionService.addInteraction(
          sessionId,
          'assistant',
          finalResponse,
          { step: session.status, toolCalls }
        );

        // Get updated session
        const updatedSession = await OnboardingSessionService.get(sessionId);

        return {
          message: finalResponse,
          session: updatedSession!,
          toolCalls
        };
      }

      // No tool calls - just return the message
      const responseText = assistantMessage?.content || 'I apologize, I encountered an error. Could you please try again?';

      // Add assistant message to interactions
      await OnboardingSessionService.addInteraction(
        sessionId,
        'assistant',
        responseText,
        { step: session.status }
      );

      // Get updated session
      const updatedSession = await OnboardingSessionService.get(sessionId);

      return {
        message: responseText,
        session: updatedSession!
      };

    } catch (error) {
      console.error(`❌ [OnboardingAgent] Error processing message:`, error);
      throw error;
    }
  }

  /**
   * Build conversation context for AI
   */
  private buildConversationContext(
    session: OnboardingSession,
    stepPrompt: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // System prompt with step-specific instructions
    const systemPrompt = `${stepPrompt}

Current session context:
- User ID: ${session.userId}
- Current step: ${session.status}
- Completed steps: ${session.data.completedSteps.join(', ')}
${session.data.websiteUrl ? `- Website: ${session.data.websiteUrl}` : ''}
${session.data.businessAnalysis?.businessName ? `- Business: ${session.data.businessAnalysis.businessName}` : ''}

Remember:
- Be conversational and friendly
- Ask one question at a time
- Confirm information before moving forward
- Use tools when appropriate
- Guide the user smoothly through the process`;

    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Add recent conversation history (last 10 interactions)
    const recentInteractions = session.interactions.slice(-10);
    for (const interaction of recentInteractions) {
      if (interaction.role !== 'system') {
        messages.push({
          role: interaction.role as 'user' | 'assistant',
          content: interaction.content
        });
      }
    }

    return messages;
  }

  /**
   * Get available tools for current step
   */
  private getToolsForStep(status: OnboardingStatus): Array<OpenAI.Chat.Completions.ChatCompletionTool> {
    const tools: Array<OpenAI.Chat.Completions.ChatCompletionTool> = [];

    // Website analysis tool (available in early steps)
    if (status === OnboardingStatus.WEBSITE_INPUT || status === OnboardingStatus.ANALYZING_WEBSITE) {
      tools.push({
        type: 'function',
        function: {
          name: 'analyze_website',
          description: 'Analyze a business website to extract information about services, contact details, and business model',
          parameters: {
            type: 'object',
            properties: {
              websiteUrl: {
                type: 'string',
                description: 'The URL of the business website to analyze'
              }
            },
            required: ['websiteUrl']
          }
        }
      });
    }

    // Move to next step tool (available in all steps)
    tools.push({
      type: 'function',
      function: {
        name: 'move_to_next_step',
        description: 'Move to the next step in the onboarding process when current step is complete',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Why we are moving to the next step'
            }
          },
          required: ['reason']
        }
      }
    });

    // Save business information tool
    if (status === OnboardingStatus.REVIEWING_ANALYSIS || 
        status === OnboardingStatus.BUSINESS_DETAILS) {
      tools.push({
        type: 'function',
        function: {
          name: 'save_business_info',
          description: 'Save confirmed business information',
          parameters: {
            type: 'object',
            properties: {
              businessName: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' },
              category: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['businessName']
          }
        }
      });
    }

    return tools;
  }

  /**
   * Execute a tool
   */
  private async executeTool(
    session: OnboardingSession,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    console.log(`🔧 [OnboardingAgent] Executing tool: ${toolName}`);

    switch (toolName) {
      case 'analyze_website':
        return this.handleAnalyzeWebsite(session, args.websiteUrl as string);

      case 'move_to_next_step':
        return this.handleMoveToNextStep(session, args.reason as string);

      case 'save_business_info':
        return this.handleSaveBusinessInfo(session, args);

      default:
        console.warn(`⚠️ [OnboardingAgent] Unknown tool: ${toolName}`);
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  /**
   * Handle website analysis tool
   */
  private async handleAnalyzeWebsite(
    session: OnboardingSession,
    websiteUrl: string
  ): Promise<unknown> {
    console.log(`🌐 [OnboardingAgent] Analyzing website: ${websiteUrl}`);
    console.log(`🌐 [OnboardingAgent] Session ID: ${session.id}`);
    console.log(`🌐 [OnboardingAgent] Business ID: ${session.businessId || 'none'}`);
    console.log(`🌐 [OnboardingAgent] MCP_SERVER_URL: ${process.env.MCP_SERVER_URL || 'not set'}`);
    console.log(`🌐 [OnboardingAgent] DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`);

    try {
      // Save website URL to session
      await OnboardingSessionService.update(session.id, {
        data: {
          websiteUrl
        }
      });

      console.log(`🌐 [OnboardingAgent] Starting website analysis...`);
      const analysisStartTime = Date.now();
      
      // Analyze website - pass sessionId for consistent table naming
      const analysis = await this.websiteAnalyzer.analyzeWebsite(
        websiteUrl, 
        session.businessId,
        session.id // Pass session ID for table name generation
      );
      
      const analysisDuration = Date.now() - analysisStartTime;
      console.log(`✅ [OnboardingAgent] Website analysis completed in ${analysisDuration}ms`);

      // Save analysis to session
      await OnboardingSessionService.update(session.id, {
        status: OnboardingStatus.REVIEWING_ANALYSIS,
        data: {
          businessAnalysis: analysis
        }
      });

      return {
        success: true,
        analysis: {
          businessName: analysis.businessName,
          description: analysis.description,
          category: analysis.category,
          services: analysis.services,
          contact: {
            email: analysis.email,
            phone: analysis.phone,
            address: analysis.address
          },
          characteristics: {
            hasMobileServices: analysis.hasMobileServices,
            hasLocationServices: analysis.hasLocationServices
          },
          confidence: analysis.confidence
        }
      };
    } catch (error) {
      console.error(`❌ [OnboardingAgent] Website analysis failed:`, error);
      console.error(`❌ [OnboardingAgent] Error stack:`, error instanceof Error ? error.stack : 'No stack');
      
      // CRITICAL: Even if analysis failed, data might have been saved to database
      // Check if we can recover the analysis from the session (fallback mechanism in WebsiteAnalyzerService)
      console.log(`🔍 [OnboardingAgent] Checking if analysis was saved despite error...`);
      
      try {
        // Wait a moment for any async saves to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh session to see if analysis was saved
        const refreshedSession = await OnboardingSessionService.get(session.id);
        
        if (refreshedSession?.data?.businessAnalysis) {
          console.log(`✅ [OnboardingAgent] Found saved analysis despite error!`);
          const analysis = refreshedSession.data.businessAnalysis;
          
          return {
            success: true,
            analysis: {
              businessName: analysis.businessName,
              description: analysis.description,
              category: analysis.category,
              services: analysis.services,
              contact: {
                email: analysis.email,
                phone: analysis.phone,
                address: analysis.address
              },
              characteristics: {
                hasMobileServices: analysis.hasMobileServices,
                hasLocationServices: analysis.hasLocationServices
              },
              confidence: analysis.confidence,
              note: 'Analysis recovered from database after timeout'
            }
          };
        }
      } catch (recoveryError) {
        console.error(`❌ [OnboardingAgent] Recovery attempt failed:`, recoveryError);
      }
      
      // Return detailed error for AI to understand
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      const isMcpTimeout = errorMessage.includes('timed out') || errorMessage.includes('-32001');
      
      return {
        success: false,
        error: errorMessage,
        details: isMcpTimeout 
          ? `The website analysis timed out. This can happen with large websites. The scraping may still be running in the background, but we couldn't retrieve the data in time. Please ask the user to provide their business information manually, or they can try again with a simpler page URL (like their homepage).`
          : `Failed to analyze website ${websiteUrl}. Error: ${errorMessage}. Please ask the user to provide business information manually.`
      };
    }
  }

  /**
   * Handle move to next step tool
   */
  private async handleMoveToNextStep(
    session: OnboardingSession,
    reason: string
  ): Promise<unknown> {
    console.log(`➡️ [OnboardingAgent] Moving to next step. Reason: ${reason}`);

    const nextStep = getNextStep(session.status);
    
    if (!nextStep) {
      // No next step - complete onboarding
      await OnboardingSessionService.complete(session.id);
      return {
        success: true,
        completed: true,
        message: 'Onboarding completed!'
      };
    }

    await OnboardingSessionService.update(session.id, {
      status: nextStep.status,
      currentStep: nextStep.order
    });

    return {
      success: true,
      nextStep: {
        name: nextStep.name,
        status: nextStep.status
      }
    };
  }

  /**
   * Handle save business info tool
   */
  private async handleSaveBusinessInfo(
    session: OnboardingSession,
    info: Record<string, unknown>
  ): Promise<unknown> {
    console.log(`💾 [OnboardingAgent] Saving business info:`, info);

    await OnboardingSessionService.update(session.id, {
      data: {
        confirmedBusinessInfo: info
      }
    });

    return {
      success: true,
      message: 'Business information saved'
    };
  }

  /**
   * Generate response after tool execution
   */
  private async generateResponseAfterTools(
    session: OnboardingSession,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage,
    toolResults: Array<{ name: string; result: unknown }>
  ): Promise<string> {
    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: assistantMessage.content || ''
    });

    // Add tool results
    for (const toolResult of toolResults) {
      messages.push({
        role: 'user',
        content: `Tool result for ${toolResult.name}: ${JSON.stringify(toolResult.result)}`
      });
    }

    // Get final response
    const finalResponse = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    return finalResponse.choices[0]?.message?.content || 'Processing complete.';
  }

  /**
   * Start onboarding conversation
   * Returns initial greeting
   */
  async startConversation(sessionId: string): Promise<string> {
    const session = await OnboardingSessionService.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const greeting = `👋 Welcome to Skedy! I'm your AI onboarding assistant.

I'm here to help you set up your business on our platform in just a few minutes. We'll get your AI-powered booking system up and running quickly!

To get started, could you share your company website URL? This will help me learn about your business and pre-fill most of the information for you.

If you don't have a website, no worries - just let me know and we'll set everything up manually.`;

    // Add greeting to interactions
    await OnboardingSessionService.addInteraction(
      sessionId,
      'assistant',
      greeting,
      { step: session.status }
    );

    return greeting;
  }
}
