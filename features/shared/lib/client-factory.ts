// Simple Supabase client factory
import { createAuthenticatedServerClient } from './supabase/server';
import { createSecretClient } from './supabase/admin-client';
import { createPublishableClient } from './supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export enum ClientType {
  ADMIN = 'admin',
  SERVER = 'server',
  CLIENT = 'client',
}

export interface ClientContext {
  type: ClientType;
  userId?: string;
}

export class DatabaseClientFactory {
  private static adminClient: SupabaseClient | null = null;
  private static serverClient: SupabaseClient | null = null;
  private static browserClient: SupabaseClient | null = null;

  static async getClient(context?: ClientContext): Promise<SupabaseClient> {
    const clientType = context?.type || this.detectClientType();

    switch (clientType) {
      case ClientType.ADMIN:
        return this._getAdminClient();
      case ClientType.SERVER:
        return this._getServerClient();
      case ClientType.CLIENT:
        return this._getBrowserClient();
      default:
        throw new Error(`Unknown client type: ${clientType}`);
    }
  }

          private static detectClientType(): ClientType {
    // API routes use admin (no user session)
    if (typeof window === 'undefined' && this.isApiRoute()) {
      return ClientType.ADMIN;
    }

    // Server components use server client
    if (typeof window === 'undefined') {
      return ClientType.SERVER;
    }

    // Browser uses client
    return ClientType.CLIENT;
  }

  private static isApiRoute(): boolean {
    return process.env.NEXT_RUNTIME === 'nodejs';
  }

  private static _getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      this.adminClient = createSecretClient();
    }
    return this.adminClient;
  }

  private static async _getServerClient(): Promise<SupabaseClient> {
    if (!this.serverClient) {
      this.serverClient = await createAuthenticatedServerClient();
    }
    return this.serverClient;
  }

  private static _getBrowserClient(): SupabaseClient {
    if (!this.browserClient) {
      this.browserClient = createPublishableClient();
    }
    return this.browserClient;
  }

  static reset(): void {
    this.adminClient = null;
    this.serverClient = null;
    this.browserClient = null;
  }

  static async getAdminClient(): Promise<SupabaseClient> {
    return this.getClient({ type: ClientType.ADMIN });
  }

  static async getServerClient(): Promise<SupabaseClient> {
    return this.getClient({ type: ClientType.SERVER });
  }

  static async getBrowserClient(): Promise<SupabaseClient> {
    return this.getClient({ type: ClientType.CLIENT });
  }
}
