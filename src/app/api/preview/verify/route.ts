import {NextRequest, NextResponse} from 'next/server';
import {verifyPreviewToken, canPreviewPost} from '@/lib/preview-tokens';

export async function POST(request: NextRequest) {
  try {
    const {token, postId} = await request.json();

    if (!token || !postId) {
      return NextResponse.json({valid: false, error: 'Missing token or postId'}, {status: 400});
    }

    const payload = await verifyPreviewToken(token);

    if (!payload) {
      return NextResponse.json({valid: false, error: 'Invalid or expired token'}, {status: 401});
    }

    // Check if token matches the requested post
    const hasPermission = canPreviewPost(payload, postId);

    if (!hasPermission) {
      return NextResponse.json(
        {valid: false, error: 'Token does not grant access to this post'},
        {status: 403}
      );
    }

    return NextResponse.json({valid: true});
  } catch (error) {
    console.error('Preview verification error:', error);
    return NextResponse.json({valid: false, error: 'Verification failed'}, {status: 500});
  }
}
