import {NextRequest, NextResponse} from 'next/server';
import type {User, UserRole} from '@/lib/types';
import {createUser, updateUserStatus} from '@/lib/cms-actions';
import {requireAdmin} from './helpers';

const ALLOWED_ROLES: UserRole[] = ['admin', 'editor', 'author', 'contributor', 'subscriber'];
const ALLOWED_STATUSES: User['status'][] = ['active', 'inactive', 'banned'];

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const rawEmail = typeof payload?.email === 'string' ? payload.email.trim() : '';
  const email = rawEmail.toLowerCase();
  const displayName =
    typeof payload?.displayName === 'string' && payload.displayName.trim()
      ? payload.displayName.trim()
      : email;
  const role = payload?.role as UserRole | undefined;
  const status = payload?.status as User['status'] | undefined;

  if (!email) {
    return NextResponse.json({error: 'Email is required'}, {status: 400});
  }

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({error: 'Invalid role'}, {status: 400});
  }

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({error: 'Invalid status'}, {status: 400});
  }

  const result = await createUser(email, displayName, role);
  if (!result.success || !result.userId) {
    const statusCode = result.code === 'auth/email-already-exists' ? 409 : 500;
    return NextResponse.json(
      {error: result.error ?? 'Failed to create user'},
      {status: statusCode}
    );
  }

  if (status && status !== 'active') {
    const statusUpdate = await updateUserStatus(result.userId, status);
    if (!statusUpdate.success) {
      return NextResponse.json(
        {error: statusUpdate.error ?? 'User created but failed to set status'},
        {status: 500}
      );
    }
  }

  return NextResponse.json({success: true, userId: result.userId}, {status: 201});
}
