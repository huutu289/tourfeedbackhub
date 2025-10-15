/**
 * Admin authentication utilities
 */

import { User } from 'firebase/auth';
import { isEmailAdmin } from '@/lib/admin-allowlist';

async function grantAdminClaimForAllowlist(user: User): Promise<boolean> {
  try {
    const token = await user.getIdToken(true);
    const response = await fetch('/api/admin/claims', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn('Failed to grant admin claim:', await response.text());
      return false;
    }

    await user.getIdToken(true);
    const refreshed = await user.getIdTokenResult();
    return refreshed.claims.admin === true;
  } catch (error) {
    console.error('Error granting admin claim:', error);
    return false;
  }
}

/**
 * Check if a user has admin privileges
 * This checks the custom claims on the user's ID token
 */
export async function isUserAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;

  try {
    let idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims.admin === true) {
      return true;
    }

    const email = (idTokenResult.claims.email as string | undefined) ?? user.email;
    if (!isEmailAdmin(email)) {
      return false;
    }

    const granted = await grantAdminClaimForAllowlist(user);
    if (!granted) {
      return false;
    }

    idTokenResult = await user.getIdTokenResult();
    return idTokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Force refresh the user's ID token to get latest custom claims
 * Call this after updating admin roles
 */
export async function refreshAdminClaims(user: User): Promise<boolean> {
  try {
    await user.getIdToken(true); // Force refresh
    return await isUserAdmin(user);
  } catch (error) {
    console.error('Error refreshing admin claims:', error);
    return false;
  }
}
