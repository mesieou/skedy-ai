/**
 * Simple MVP Auth Utils
 *
 * Startup-style auth: simple, fast, scalable
 */

import { createAuthenticatedServerClient } from './server';
import { UserRole } from '../database/types/user';

/**
 * Get current user's role from database
 * Returns null if not authenticated
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const supabase = await createAuthenticatedServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Simple query - just get the role
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    return data?.role || null;
  } catch {
    return null;
  }
}

/**
 * Require SUPER_ADMIN access (throws if not)
 * Use in API routes: await requireSuperAdmin();
 */
export async function requireSuperAdmin(): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== UserRole.SUPER_ADMIN) {
    throw new Error('Access denied: SUPER_ADMIN role required');
  }
}

/**
 * Check if current user has specific role
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === requiredRole;
}

/**
 * Require one of multiple roles (for future scaling)
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<void> {
  const role = await getCurrentUserRole();
  if (!role || !allowedRoles.includes(role)) {
    throw new Error(`Access denied: One of [${allowedRoles.join(', ')}] roles required`);
  }
}
