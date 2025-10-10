/**
 * Admin authentication utilities
 */

import { User } from 'firebase/auth';

/**
 * Check if a user has admin privileges
 * This checks the custom claims on the user's ID token
 */
export async function isUserAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;

  try {
    const idTokenResult = await user.getIdTokenResult();
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

/**
 * Admin-only email list for additional verification
 * This is a backup check in case custom claims aren't set
 */
const ADMIN_EMAILS = [
  'huutu289@gmail.com',
  'iposntmk@gmail.com',
];

export function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
