import { Session } from "../../sessions/session";

export interface SessionCreatedMessage {
  type: "session.created";
  session: {
    conversation_id: string;
  };
}

export async function saveOpenAiConversationId(
  session: Session, 
  event: SessionCreatedMessage
): Promise<void> {
  const { conversation_id } = event.session;
  
  // Store the OpenAI conversation ID in our session
  session.openAiConversationId = conversation_id;
  
  console.log(`🎯 [SessionCreated] Stored conversation ID: ${conversation_id} for session ${session.id}`);
}
