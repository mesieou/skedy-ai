import { createSecretClient } from '../../supabase/admin-client';
import type { AuthUser, CreateAuthUserData } from '../types/auth-user';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance to prevent multiple client creation
let authClient: SupabaseClient | null = null;

export class AuthUserRepository {
  private supabase: SupabaseClient;
  private createdUserIds: string[] = [];

  constructor() {
    if (!authClient) {
      authClient = createSecretClient();
    }
    this.supabase = authClient;
  }

  // Create auth user
  async create(data: CreateAuthUserData): Promise<AuthUser> {
    const { data: result, error } = await this.supabase.auth.admin.createUser({
      email: data.email,
      password: data.password || 'TestPassword123!',
      email_confirm: data.email_confirm !== false,
    });

    if (error) throw new Error(`Failed to create auth user: ${error.message}`);
    if (!result.user?.id) throw new Error('Auth user created but no ID returned');
    
    // Track for cleanup
    this.createdUserIds.push(result.user.id);
    
    return {
      id: result.user.id,
      email: result.user.email!,
      password: data.password,
      email_confirm: data.email_confirm,
      created_at: result.user.created_at,
      updated_at: result.user.updated_at,
      email_confirmed_at: result.user.email_confirmed_at,
      last_sign_in_at: result.user.last_sign_in_at,
      is_sso_user: result.user.is_sso_user,
      app_metadata: result.user.app_metadata,
      user_metadata: result.user.user_metadata,
    } as AuthUser;
  }

  // Find all created auth users (for cleanup)
  async findAll(): Promise<AuthUser[]> {
    const users: AuthUser[] = [];
    for (const userId of this.createdUserIds) {
      const user = await this.findOne({ id: userId });
      if (user) users.push(user);
    }
    return users;
  }

  // Delete auth user
  async deleteOne(conditions: { id: string }): Promise<void> {
    const { error } = await this.supabase.auth.admin.deleteUser(conditions.id);
    if (error) {
      throw new Error(`Failed to delete auth user: ${error.message}`);
    }
    // Remove from tracking
    this.createdUserIds = this.createdUserIds.filter(id => id !== conditions.id);
  }

  // Find one auth user
  async findOne(conditions: { id: string }): Promise<AuthUser | null> {
    const { data, error } = await this.supabase.auth.admin.getUserById(conditions.id);
    if (error || !data.user) return null;
    
    return {
      id: data.user.id,
      email: data.user.email!,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at,
      email_confirmed_at: data.user.email_confirmed_at,
      last_sign_in_at: data.user.last_sign_in_at,
      is_sso_user: data.user.is_sso_user,
      app_metadata: data.user.app_metadata,
      user_metadata: data.user.user_metadata,
    } as AuthUser;
  }
}
