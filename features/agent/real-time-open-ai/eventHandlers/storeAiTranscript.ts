import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";
import { ServerResponseOutputAudioTranscriptDoneEvent } from "../types/server/events/response/serverResponseOutputAudioTranscriptDoneTypes";
import { Interaction, InteractionType, CreateInteractionData } from "@/features/shared/lib/database/types/interactions";
import assert from "assert";

export async function storeAiTranscript(
  session: Session,
  event: ServerResponseOutputAudioTranscriptDoneEvent
): Promise<void> {
  try {
    const { transcript, item_id } = event;

    console.log(`🤖 [AI Transcript] AI said: "${transcript}"`);
    console.log(`🤖 [AI Transcript] Transcript length: ${transcript.length} characters`);

    // Check for potential truncation indicators
    if (transcript.length > 500) {
      console.log(`📏 [AI Transcript] Long transcript detected (${transcript.length} chars) - checking for truncation`);
    }

    if (transcript.endsWith('...') || transcript.endsWith('…')) {
      console.warn(`✂️ [AI Transcript] WARNING: Transcript appears to be truncated (ends with ellipsis)`);
    }

    if (!transcript.trim().endsWith('.') && !transcript.trim().endsWith('?') && !transcript.trim().endsWith('!')) {
      console.warn(`✂️ [AI Transcript] WARNING: Transcript may be incomplete (doesn't end with punctuation)`);
    }

    // Add breadcrumb for AI transcript
    sentry.addBreadcrumb(`AI transcript received`, 'ai-transcript', {
      sessionId: session.id,
      businessId: session.businessId,
      conversationId: session.openAiConversationId,
      itemId: item_id,
      transcriptLength: transcript.length,
      possiblyTruncated: transcript.endsWith('...') || transcript.endsWith('…')
    });

    // Validate required session data
    assert(session.aiInstructions, 'aiInstructions required for interactions');
    assert(session.promptName, 'promptName required for interactions');
    assert(session.promptVersion, 'promptVersion required for interactions');

    // Create interaction immediately when AI responds
    const interactionData: CreateInteractionData = {
      session_id: session.id,
      business_id: session.businessId,
      user_id: session.customerId || null,
      type: session.isFirstAiResponse ? InteractionType.INITIAL : InteractionType.NORMAL,
      customer_input: session.isFirstAiResponse ? null : (session.pendingCustomerInput || null),
      prompt: session.aiInstructions,
      prompt_name: session.promptName,
      prompt_version: session.promptVersion,
      model_output: transcript,
      generated_from_tool_calling: false // Start with false, updated by function calls if needed
    };

    // Add interaction to session (will be auto-synced to Redis)
    session.interactions.push(interactionData as Interaction);

    // Reset flags for next cycle
    if (session.isFirstAiResponse) {
      session.isFirstAiResponse = false;
      console.log(`🎯 [AI Transcript] Created INITIAL interaction for session ${session.id}`);
    } else {
      session.pendingCustomerInput = undefined;
      console.log(`🎯 [AI Transcript] Created NORMAL interaction for session ${session.id}`);
    }

  } catch (error) {
    console.error(`❌ [AI Transcript] Failed to store AI transcript for session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'store_ai_transcript',
      metadata: {
        eventType: 'response.output_audio_transcript.done',
        conversationId: session.openAiConversationId,
        itemId: event.item_id
      }
    });
  }
}
