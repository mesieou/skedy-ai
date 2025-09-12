import { Session } from "../sessions/session";
import { WebSocketPool } from "../sessions/websocketPool";
import { createWebSocket } from "../ws/websocketService";
import redis from "../redis/redisClient";

export async function handleIncomingCall(req, res) {
  const { CallSid, To, From } = req.body;

  // Load business context
  const businessId = getBusinessFromNumber(To);
  const tools = loadBusinessTools(businessId);

  const { apiKey, index } = wsPool.assign();

  const session: Session = {
    id: CallSid,
    businessId,
    wsIndex: index,
    ws: null as any,
    tools,
    messages: [],
    context: { customerNumber: From, businessNumber: To, startTime: Date.now(), tokenUsage: {input:0,output:0} }
  };

  sessionManager.add(session);
  await createWebSocket(apiKey, session, redis);

  res.send("<Response><Say>Connecting you now...</Say></Response>");
}
