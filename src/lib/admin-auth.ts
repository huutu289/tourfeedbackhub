/**
 * Admin authentication utilities
 */

import type {User} from 'firebase/auth';

function hasAdminRole(claims: Record<string, unknown>): boolean {
  const roleClaim = claims.role;
  if (typeof roleClaim === 'string' && roleClaim.toLowerCase() === 'admin') {
    return true;
  }
  return claims.admin === true;
}

/**
 * Check if a user has admin privileges based on custom claims.
 */
export async function isUserAdmin(user: User | null): Promise<boolean> {
  if (!user) {
    console.log('[isUserAdmin] No user provided');
    return false;
  }

  try {
    const tokenResult = await user.getIdTokenResult();
    const isAdmin = hasAdminRole(tokenResult.claims);
    console.log('[isUserAdmin] Admin status:', isAdmin, 'claims:', tokenResult.claims);
    return isAdmin;
  } catch (error) {
    console.error('[isUserAdmin] Error checking admin status:', error);
    return false;
  }
}

/**
 * Force refresh the user's ID token to get latest custom claims.
 */
export async function refreshAdminClaims(user: User): Promise<boolean> {
  try {
    await user.getIdToken(true);
    return isUserAdmin(user);
  } catch (error) {
    console.error('[refreshAdminClaims] Error refreshing admin claims:', error);
    return false;
  }
}
