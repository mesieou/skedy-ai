// Enterprise-grade Supabase client factory for all environments
import { createAuthenticatedServerClient } from './supabase/server';
import { createSecretClient } from './supabase/admin-client';
import { createPublishableClient } from './supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Client types for different use cases
 */
export enum ClientType {
  ADMIN = 'admin',    // Secret key - full database access
  SERVER = 'server',  // Server-side with user auth
  CLIENT = 'client',  // Browser-side with user auth  
}

/**
 * Client context for proper client selection
 */
export interface ClientContext {
  type: ClientType;
  userId?: string;    // Optional user context
}

export class DatabaseClientFactory {
  // Singleton instances per client type
  private static adminClient: SupabaseClient | null = null;
  private static serverClient: SupabaseClient | null = null;
  private static browserClient: SupabaseClient | null = null;

  /**
   * Get client based on context - MAIN METHOD
   */
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

  /**
   * Auto-detect client type based on environment
   */
  private static detectClientType(): ClientType {
    if (process.env.NODE_ENV === 'test' || process.env.USE_SECRET_CLIENT === 'true') {
      return ClientType.ADMIN;
    }
    
    if (typeof window === 'undefined') {
      // Server-side
      return ClientType.SERVER;
    } else {
      // Browser-side
      return ClientType.CLIENT;
    }
  }

  /**
   * Admin client - Full database access (tests, admin operations)
   */
  private static _getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      this.adminClient = createSecretClient();
    }
    return this.adminClient;
  }

  /**
   * Server client - Server-side with user authentication
   */
  private static async _getServerClient(): Promise<SupabaseClient> {
    if (!this.serverClient) {
      this.serverClient = await createAuthenticatedServerClient();
    }
    return this.serverClient;
  }

  /**
   * Browser client - Client-side with user authentication
   */
  private static _getBrowserClient(): SupabaseClient {
    if (!this.browserClient) {
      this.browserClient = createPublishableClient();
    }
    return this.browserClient;
  }



  /**
   * NOTE: For middleware clients, use the existing middleware.ts file
   * Middleware clients are per-request and handle session management/routing.
   * 
   * @see features/shared/lib/supabase/middleware.ts
   */

  /**
   * Reset all clients (testing)
   */
  static reset(): void {
    this.adminClient = null;
    this.serverClient = null;
    this.browserClient = null;
  }

  /**
   * Get specific client type directly
   */
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
