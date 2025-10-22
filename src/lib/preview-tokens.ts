/**
 * Preview token utilities for secure draft post access
 */

import {SignJWT, jwtVerify} from 'jose';

const SECRET_KEY = process.env.PREVIEW_TOKEN_SECRET || 'change-me-in-production';
const ALGORITHM = 'HS256';
const TOKEN_EXPIRY = '1h'; // 1 hour

interface PreviewTokenPayload {
  postId: string;
  userId?: string;
  exp?: number;
}

/**
 * Generate a short-lived preview token for a post
 */
export async function generatePreviewToken(postId: string, userId?: string): Promise<string> {
  const secret = new TextEncoder().encode(SECRET_KEY);

  const token = await new SignJWT({postId, userId} as PreviewTokenPayload)
    .setProtectedHeader({alg: ALGORITHM})
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);

  return token;
}

/**
 * Verify and decode a preview token
 * Returns postId if valid, null if invalid/expired
 */
export async function verifyPreviewToken(token: string): Promise<PreviewTokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(SECRET_KEY);
    const {payload} = await jwtVerify(token, secret);

    return payload as PreviewTokenPayload;
  } catch (error) {
    console.error('Preview token verification failed:', error);
    return null;
  }
}

/**
 * Check if user has permission to preview this post
 */
export function canPreviewPost(
  tokenPayload: PreviewTokenPayload | null,
  postId: string,
  userId?: string
): boolean {
  if (!tokenPayload) return false;

  // Token must match the post ID
  if (tokenPayload.postId !== postId) return false;

  // If token has a userId, current user must match
  if (tokenPayload.userId && tokenPayload.userId !== userId) return false;

  return true;
}
