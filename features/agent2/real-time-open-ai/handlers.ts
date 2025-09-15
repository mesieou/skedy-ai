import { Session } from "../sessions/session";
import { RedisClient } from "../redis/redisClient";

// Attach handlers to the WebSocket
export function attachWSHandlers(session: Session, redis: RedisClient) {
  session.ws.on("message", async (raw) => {
    const event = JSON.parse(raw.toString());

    switch(event.type) {
      case "response.output_text.delta":
        session.messages.push({ role: "agent", content: event.delta });
        await redis.rpush(`messages:${session.id}`, JSON.stringify({ role: "agent", content: event.delta }));
        break;
    }
  });
}
