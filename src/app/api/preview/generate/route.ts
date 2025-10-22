import {NextRequest, NextResponse} from 'next/server';
import {generatePreviewToken} from '@/lib/preview-tokens';
import {getAuth} from 'firebase-admin/auth';
import {initializeApp, getApps, cert} from 'firebase-admin/app';

// Initialize Firebase Admin
function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function POST(request: NextRequest) {
  try {
    const {postId} = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!postId) {
      return NextResponse.json({error: 'Missing postId'}, {status: 400});
    }

    // Verify user is authenticated
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json({error: 'Invalid auth token'}, {status: 401});
    }

    // Check if user is admin (has permission to preview)
    const isAdmin = decodedToken.admin === true || decodedToken.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({error: 'Insufficient permissions'}, {status: 403});
    }

    // Generate preview token
    const token = await generatePreviewToken(postId, decodedToken.uid);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';
    const previewUrl = `${baseUrl}/blog/preview?preview=true&id=${postId}&token=${token}`;

    return NextResponse.json({
      token,
      previewUrl,
      expiresIn: '1h',
    });
  } catch (error) {
    console.error('Preview token generation error:', error);
    return NextResponse.json({error: 'Failed to generate token'}, {status: 500});
  }
}
