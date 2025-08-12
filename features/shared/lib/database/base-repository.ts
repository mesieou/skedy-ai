// features/shared/lib/database/base-repository.ts
import { createAuthenticatedServerClient } from '../supabase/server';
import { createSecretClient } from '../supabase/admin-client';
import type { BaseEntity, QueryOptions, QueryConditions } from './types/base';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instances to prevent multiple client creation
let testClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

export class BaseRepository<T extends BaseEntity> {
  protected supabase: SupabaseClient | null = null;
  
  constructor(protected tableName: string) {
    // We'll inject the client when needed to avoid async constructor
  }

  protected async getClient() {
    if (!this.supabase) {
      // Use secret client for tests and API routes, authenticated server client for app pages
      if (process.env.NODE_ENV === 'test' || process.env.USE_SECRET_CLIENT === 'true') {
        if (!testClient) {
          testClient = createSecretClient();
        }
        this.supabase = testClient;
      } else {
        if (!serverClient) {
          serverClient = await createAuthenticatedServerClient();
        }
        this.supabase = serverClient;
      }
    }
    return this.supabase;
  }

  // Find one record by any conditions
  async findOne(conditions: QueryConditions, options: QueryOptions = {}): Promise<T | null> {
    const client = await this.getClient();
    let query = client
      .from(this.tableName)
      .select(options.select || '*');

    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`Failed to find ${this.tableName}: ${error.message}`);
    return data as unknown as T | null;
  }

  // Find multiple records with filtering and pagination
  async findAll(options: QueryOptions = {}, conditions: QueryConditions = {}): Promise<T[]> {
    const client = await this.getClient();
    let query = client
      .from(this.tableName)
      .select(options.select || '*');

    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to find all ${this.tableName}: ${error.message}`);
    return (data || []) as unknown as T[];
  }

  // Create a single record
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const client = await this.getClient();
    const { data: result, error } = await client
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Failed to create ${this.tableName}: ${error.message}`);
    return result as unknown as T;
  }

  // Update one record by any conditions
  async updateOne(conditions: QueryConditions, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T> {
    const client = await this.getClient();
    let query = client
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() });

    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: result, error } = await query.select().single();
    if (error) throw new Error(`Failed to update ${this.tableName}: ${error.message}`);
    return result as unknown as T;
  }

  // Delete one record by any conditions
  async deleteOne(conditions: QueryConditions): Promise<void> {
    const client = await this.getClient();
    let query = client.from(this.tableName).delete();

    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { error } = await query;
    if (error) throw new Error(`Failed to delete ${this.tableName}: ${error.message}`);
  }

  // Count records with optional conditions
  async count(conditions: QueryConditions = {}): Promise<number> {
    const client = await this.getClient();
    let query = client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;
    if (error) throw new Error(`Failed to count ${this.tableName}: ${error.message}`);
    return count || 0;
  }

  // Create multiple records in batch
  async createMany(items: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from(this.tableName)
      .insert(items)
      .select();

    if (error) throw new Error(`Failed to create multiple ${this.tableName}: ${error.message}`);
    return (data || []) as unknown as T[];
  }

  // Delete multiple records by ids
  async deleteMany(ids: string[]): Promise<void> {
    const client = await this.getClient();
    const { error } = await client
      .from(this.tableName)
      .delete()
      .in('id', ids);

    if (error) throw new Error(`Failed to delete multiple ${this.tableName}: ${error.message}`);
  }
}