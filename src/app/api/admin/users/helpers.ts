import {initializeFirebaseAdmin} from '@/firebase/admin';
import {getAuth, type DecodedIdToken} from 'firebase-admin/auth';
import {NextResponse, type NextRequest} from 'next/server';

type AdminCheckResult =
  | {decoded: DecodedIdToken}
  | NextResponse;

function unauthorized(message: string, status = 401) {
  return NextResponse.json({error: message}, {status});
}

export async function requireAdmin(request: NextRequest): Promise<AdminCheckResult> {
  const authorization =
    request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return unauthorized('Missing bearer token');
  }

  const idToken = authorization.slice('Bearer '.length).trim();
  if (!idToken) {
    return unauthorized('Empty bearer token');
  }

  const adminServices = initializeFirebaseAdmin();
  if (!adminServices) {
    return NextResponse.json({error: 'Firebase Admin SDK is not configured'}, {status: 500});
  }

  try {
    const auth = getAuth(adminServices.app);
    const decoded = await auth.verifyIdToken(idToken, true);
    const isAdminClaim =
      decoded.admin === true ||
      (typeof decoded.role === 'string' && decoded.role.toLowerCase() === 'admin');
    if (!isAdminClaim) {
      return unauthorized('Admin privileges required', 403);
    }

    return {decoded};
  } catch (error) {
    console.error('Failed to verify admin token', error);
    return unauthorized('Invalid or expired token', 401);
  }
}
