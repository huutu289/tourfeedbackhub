/**
 * Admin authentication utilities
 */

import { User } from 'firebase/auth';
import { isEmailAdmin } from '@/lib/admin-allowlist';

async function grantAdminClaimForAllowlist(user: User): Promise<boolean> {
  try {
    console.log('[grantAdminClaim] Starting admin claim grant process');
    const token = await user.getIdToken(true);
    console.log('[grantAdminClaim] Got ID token, calling API...');
    
    const response = await fetch('/api/admin/claims', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('[grantAdminClaim] API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[grantAdminClaim] Failed to grant admin claim:', errorText);
      return false;
    }

    console.log('[grantAdminClaim] Admin claim granted, refreshing token...');
    await user.getIdToken(true);
    const refreshed = await user.getIdTokenResult();
    const isAdmin = refreshed.claims.admin === true;
    console.log('[grantAdminClaim] Final admin status:', isAdmin);
    return isAdmin;
  } catch (error) {
    console.error('[grantAdminClaim] Error granting admin claim:', error);
    return false;
  }
}

/**
 * Check if a user has admin privileges
 * This checks the custom claims on the user's ID token
 */
export async function isUserAdmin(user: User | null): Promise<boolean> {
  if (!user) {
    console.log('[isUserAdmin] No user provided');
    return false;
  }

  try {
    console.log('[isUserAdmin] Checking admin status for user:', user.email);
    let idTokenResult = await user.getIdTokenResult();
    console.log('[isUserAdmin] Current claims:', idTokenResult.claims);
    
    if (idTokenResult.claims.admin === true) {
      console.log('[isUserAdmin] User already has admin claim');
      return true;
    }

    const email = (idTokenResult.claims.email as string | undefined) ?? user.email;
    console.log('[isUserAdmin] Checking if email is in allowlist:', email);
    
    if (!isEmailAdmin(email)) {
      console.log('[isUserAdmin] Email not in admin allowlist');
      return false;
    }

    console.log('[isUserAdmin] Email is in allowlist, granting admin claim...');
    const granted = await grantAdminClaimForAllowlist(user);
    if (!granted) {
      console.log('[isUserAdmin] Failed to grant admin claim');
      return false;
    }

    idTokenResult = await user.getIdTokenResult();
    const finalStatus = idTokenResult.claims.admin === true;
    console.log('[isUserAdmin] Final admin status:', finalStatus);
    return finalStatus;
  } catch (error) {
    console.error('[isUserAdmin] Error checking admin status:', error);
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
