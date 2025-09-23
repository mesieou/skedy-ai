import { Session } from "./session";
import assert from "assert";

export class SessionManager {
  private sessions = new Map<string, Session>();

  add(session: Session) {
    assert(session && session.id, 'SessionManager.add: session must have an id');
    assert(session.businessId, 'SessionManager.add: session must have a businessId');
    this.sessions.set(session.id, session);
  }
  get(id: string) {
    assert(id && typeof id === 'string', 'SessionManager.get: id must be a non-empty string');
    return this.sessions.get(id);
  }
  remove(id: string) {
    assert(id && typeof id === 'string', 'SessionManager.remove: id must be a non-empty string');
    this.sessions.delete(id);
  }
  list() { return Array.from(this.sessions.values()); }
}
