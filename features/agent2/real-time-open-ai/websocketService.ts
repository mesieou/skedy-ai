import { Session } from "../sessions/session";
import { RedisClient } from "../redis/redisClient";
import { attachWSHandlers } from "./handlers";
import WebSocket from "ws";


export async function createWebSocket(apiKey: string, session: Session, redis: RedisClient) {

  // Create WebSocket connection
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${session.id}`, [
    `Authorization: Bearer ${apiKey}`
  ]);

  session.ws = ws as WebSocket;

  // Attach handlers to the WebSocket
  attachWSHandlers(session, redis);

  // Return the WebSocket connection
  return ws;
}
