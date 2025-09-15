import { Session } from "./session";

export class SessionManager {
  private sessions = new Map<string, Session>();

  add(session: Session) { this.sessions.set(session.id, session); }
  get(id: string) { return this.sessions.get(id); }
  remove(id: string) { this.sessions.delete(id); }
  list() { return Array.from(this.sessions.values()); }
}

export const sessionManager = new SessionManager();
