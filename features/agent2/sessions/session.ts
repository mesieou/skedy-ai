import { Business } from "../../shared/lib/database/types/business";
import { User } from "../../shared/lib/database/types/user";
import { Interaction } from "../../shared/lib/database/types/interactions";
import { TokenSpent } from "../types";

export interface Session {
  id: string;              // Call SID
  busisnessId: string;
  businessEntity: Business;
  customerNumber: string;
  customerId?: string;
  customerEntity?: User;
  status: "active" | "ended";
  wsIndex: number;
  ws: WebSocket;
  channel: "phone" | "whatsapp" | "website";
  interactions: Interaction[];
  tokenUsage: TokenSpent;
  startedAt: number;
  endedAt?: number;
  durationInMinutes?: number;
}
