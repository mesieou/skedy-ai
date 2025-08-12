import { BaseEntity } from "./base";

export interface AuthUser extends BaseEntity {
  email: string;
  password?: string;
  email_confirm?: boolean;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  is_sso_user?: boolean;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export type CreateAuthUserData = Omit<AuthUser, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAuthUserData = Partial<Omit<AuthUser, 'id' | 'created_at'>>;
