/**
 * Enterprise Supabase Client Factory
 *
 * Automatically detects execution context and provides the appropriate client
 * Follows enterprise patterns for scalability and maintainability
 */

import { createSecretClient } from './supabase/admin-client';
import { createAuthenticatedServerClient } from './supabase/server';
import { createPublishableClient } from './supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export enum ClientType {
  ADMIN = 'admin',      // Full access (scripts, API routes, webhooks)
  SERVER = 'server',    // User session (server components)
  CLIENT = 'client',    // Browser (client components)
}

export interface ClientContext {
  type: ClientType;
  userId?: string;
}

/**
 * Enterprise client factory with automatic context detection
 */
export class DatabaseClientFactory {
  // Singleton instances (memory optimization)
  private static adminClient: SupabaseClient | null = null;
  private static serverClient: SupabaseClient | null = null;
  private static browserClient: SupabaseClient | null = null;

  /**
   * Main entry point - automatically detects context or uses explicit type
   */
  static async getClient(context?: ClientContext): Promise<SupabaseClient> {
    const clientType = context?.type || this.detectClientType();

    switch (clientType) {
      case ClientType.ADMIN:
        return this.getAdminClient();

      case ClientType.SERVER:
        return this.getServerClient();

      case ClientType.CLIENT:
        return this.getBrowserClient();

      default:
        throw new Error(`Unknown client type: ${clientType}`);
    }
  }

  /**
   * Automatic context detection (enterprise-grade)
   */
  private static detectClientType(): ClientType {
    // 1. Browser environment
    if (typeof window !== 'undefined') {
      return ClientType.CLIENT;
    }

    // 2. Script execution (no HTTP context)
    if (this.isScriptExecution()) {
      return ClientType.ADMIN;
    }

    // 3. API routes (HTTP context, no user session)
    if (this.isApiRoute()) {
      return ClientType.ADMIN;
    }

    // 4. Server components (HTTP context + user session)
    return ClientType.SERVER;
  }

  /**
   * Detect script execution (vs web server)
   */
  private static isScriptExecution(): boolean {
    // Check execution path for script indicators
    const execPath = process.argv[1] || '';

    // Common script patterns
    if (execPath.includes('scripts/')) return true;
    if (execPath.includes('seed')) return true;
    if (execPath.includes('.ts') && !execPath.includes('node_modules')) return true;
    if (process.argv.some(arg => arg.includes('tsx'))) return true;

    // Check if Next.js HTTP context is available
    try {
      // This will throw in script execution
      eval('require("next/headers").headers()');
      return false; // Has HTTP context
    } catch {
      return true;  // No HTTP context = script
    }
  }

  /**
   * Detect API route execution
   */
  private static isApiRoute(): boolean {
    return process.env.NEXT_RUNTIME === 'nodejs';
  }

  /**
   * Admin client - Full database access
   * Use cases: Scripts, API routes, webhooks, background jobs
   */
  static getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      this.adminClient = createSecretClient();
      console.log('🔑 Using ADMIN client (full access)');
    }
    return this.adminClient;
  }

  /**
   * Server client - User session based
   * Use cases: Server components, server actions with user auth
   */
  static async getServerClient(): Promise<SupabaseClient> {
    if (!this.serverClient) {
      this.serverClient = await createAuthenticatedServerClient();
      console.log('👤 Using SERVER client (user session)');
    }
    return this.serverClient;
  }

  /**
   * Browser client - Client-side user auth
   * Use cases: Client components, React hooks, user interactions
   */
  static getBrowserClient(): SupabaseClient {
    if (!this.browserClient) {
      this.browserClient = createPublishableClient();
      console.log('🌐 Using CLIENT browser client');
    }
    return this.browserClient;
  }

  /**
   * Reset all clients (for testing/cleanup)
   */
  static reset(): void {
    this.adminClient = null;
    this.serverClient = null;
    this.browserClient = null;
  }

  /**
   * Explicit client getters (when you know what you need)
   */
  static async forAdmin(): Promise<SupabaseClient> {
    return this.getClient({ type: ClientType.ADMIN });
  }

  static async forServer(): Promise<SupabaseClient> {
    return this.getClient({ type: ClientType.SERVER });
  }

  static async forBrowser(): Promise<SupabaseClient> {
    return this.getClient({ type: ClientType.CLIENT });
  }

  /**
   * Development utilities
   */
  static getClientType(): ClientType {
    return this.detectClientType();
  }

  static isProduction(): boolean {
    return process.env.VERCEL_URL !== undefined ||
           process.env.NEXT_PUBLIC_VERCEL_URL !== undefined;
  }

  static isDevelopment(): boolean {
    return !this.isProduction();
  }
}
