import {NextRequest, NextResponse} from 'next/server';
import type {User, UserRole} from '@/lib/types';
import {deleteUser, updateUserDetails} from '@/lib/cms-actions';
import {requireAdmin} from '../helpers';

const ALLOWED_ROLES: UserRole[] = ['admin', 'editor', 'author', 'contributor', 'subscriber'];
const ALLOWED_STATUSES: User['status'][] = ['active', 'inactive', 'banned'];

export async function PATCH(
  request: NextRequest,
  {params}: {params: {userId: string}}
) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  const userId = params.userId;
  if (!userId) {
    return NextResponse.json({error: 'User ID is required'}, {status: 400});
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON payload'}, {status: 400});
  }

  const updates: Parameters<typeof updateUserDetails>[1] = {};

  if (typeof payload?.displayName === 'string') {
    const trimmed = payload.displayName.trim();
    if (!trimmed) {
      return NextResponse.json({error: 'Display name cannot be empty'}, {status: 400});
    }
    updates.displayName = trimmed;
  }

  if (payload?.role) {
    const role = payload.role as UserRole;
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({error: 'Invalid role'}, {status: 400});
    }
    updates.role = role;
  }

  if (payload?.status) {
    const status = payload.status as User['status'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({error: 'Invalid status'}, {status: 400});
    }
    updates.status = status;
  }

  if (typeof payload?.avatarUrl !== 'undefined') {
    updates.avatarUrl = payload.avatarUrl ?? null;
  }
  if (typeof payload?.bio !== 'undefined') {
    updates.bio = payload.bio ?? null;
  }
  if (typeof payload?.website !== 'undefined') {
    updates.website = payload.website ?? null;
  }
  if (typeof payload?.socialLinks !== 'undefined') {
    updates.socialLinks = payload.socialLinks ?? null;
  }
  if (typeof payload?.permissions !== 'undefined') {
    updates.permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({error: 'No valid fields to update'}, {status: 400});
  }

  const result = await updateUserDetails(userId, updates);
  if (!result.success) {
    return NextResponse.json(
      {error: result.error ?? 'Failed to update user'},
      {status: 500}
    );
  }

  return NextResponse.json({success: true});
}

export async function DELETE(
  request: NextRequest,
  {params}: {params: {userId: string}}
) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  const userId = params.userId;
  if (!userId) {
    return NextResponse.json({error: 'User ID is required'}, {status: 400});
  }

  if (adminCheck.decoded.uid === userId) {
    return NextResponse.json(
      {error: 'You cannot delete your own account'},
      {status: 400}
    );
  }

  const result = await deleteUser(userId);
  if (!result.success) {
    return NextResponse.json(
      {error: result.error ?? 'Failed to delete user'},
      {status: 500}
    );
  }

  return NextResponse.json({success: true});
}
