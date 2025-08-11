export interface User {
  sub: string;
  email?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  role?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
  [key: string]: unknown; // Allow additional Supabase JWT claims
}
