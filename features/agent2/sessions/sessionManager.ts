import { Session } from "./session";
import { sessionSyncManager } from "./sessionSyncManager";

export class SessionManager {
  private sessions = new Map<string, Session>();

  add(session: Session) { this.sessions.set(session.id, session); }
  get(id: string) { return this.sessions.get(id); }
  remove(id: string) { this.sessions.delete(id); }
  list() { return Array.from(this.sessions.values()); }
}

// Export the sync-enabled session manager instead of the basic one
// Note: sessionSyncManager has async get() method for Redis fallback
export const sessionManager = sessionSyncManager;
