'use server';

import {initializeApp, getApps, cert} from 'firebase-admin/app';
import {getStorage} from 'firebase-admin/storage';
import {getFirestore, Timestamp} from 'firebase-admin/firestore';
import type {MediaItem, MediaType} from './types';

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
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

function getMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('msword') ||
    mimeType.includes('officedocument')
  ) {
    return 'document';
  }
  return 'other';
}

export async function uploadMedia(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  uploadedBy: string,
  metadata?: {
    title?: string;
    altText?: string;
    caption?: string;
    description?: string;
  }
) {
  try {
    const adminApp = getAdminApp();
    const storage = getStorage(adminApp);
    const db = getFirestore(adminApp);

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `media/${timestamp}_${sanitizedFileName}`;

    // Upload to Firebase Storage
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Get file metadata
    const [fileMetadata] = await file.getMetadata();
    const fileSize = parseInt(fileMetadata.size || '0');

    // Create media document in Firestore
    const mediaData: Partial<MediaItem> = {
      fileName: sanitizedFileName,
      title: metadata?.title || sanitizedFileName,
      altText: metadata?.altText,
      caption: metadata?.caption,
      description: metadata?.description,
      mimeType,
      fileSize,
      mediaType: getMediaType(mimeType),
      url: publicUrl,
      storagePath,
      uploadedBy,
      uploadedAt: Timestamp.now() as any,
    };

    // For images, we could add width/height here if needed
    // You could use sharp library for image processing

    const docRef = await db.collection('media').add(mediaData);

    return {
      success: true,
      media: {
        id: docRef.id,
        ...mediaData,
        uploadedAt: new Date(),
      } as MediaItem,
    };
  } catch (error: any) {
    console.error('Error uploading media:', error);
    return {success: false, error: error.message};
  }
}

export async function deleteMedia(mediaId: string) {
  try {
    const adminApp = getAdminApp();
    const storage = getStorage(adminApp);
    const db = getFirestore(adminApp);

    // Get media document
    const mediaDoc = await db.collection('media').doc(mediaId).get();

    if (!mediaDoc.exists) {
      return {success: false, error: 'Media not found'};
    }

    const mediaData = mediaDoc.data();
    const storagePath = mediaData?.storagePath;

    if (storagePath) {
      // Delete from Storage
      const bucket = storage.bucket();
      const file = bucket.file(storagePath);

      try {
        await file.delete();
      } catch (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue even if storage deletion fails
      }
    }

    // Delete from Firestore
    await db.collection('media').doc(mediaId).delete();

    return {success: true};
  } catch (error: any) {
    console.error('Error deleting media:', error);
    return {success: false, error: error.message};
  }
}

export async function updateMediaMetadata(
  mediaId: string,
  metadata: {
    title?: string;
    altText?: string;
    caption?: string;
    description?: string;
  }
) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    await db.collection('media').doc(mediaId).update({
      ...metadata,
      updatedAt: Timestamp.now(),
    });

    return {success: true};
  } catch (error: any) {
    console.error('Error updating media metadata:', error);
    return {success: false, error: error.message};
  }
}

export async function getMedia(filters?: {mediaType?: MediaType; limit?: number}) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    let mediaQuery = db.collection('media').orderBy('uploadedAt', 'desc');

    if (filters?.mediaType) {
      mediaQuery = mediaQuery.where('mediaType', '==', filters.mediaType) as any;
    }

    if (filters?.limit) {
      mediaQuery = mediaQuery.limit(filters.limit) as any;
    }

    const snapshot = await mediaQuery.get();
    const media = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate() || new Date(),
      } as MediaItem;
    });

    return {success: true, media};
  } catch (error: any) {
    console.error('Error getting media:', error);
    return {success: false, error: error.message};
  }
}

// Client-side upload function (to be called from browser)
export async function uploadMediaFromClient(formData: FormData, uploadedBy: string) {
  try {
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return {success: false, error: 'No files provided'};
    }

    const uploadPromises = files.map(async file => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return uploadMedia(buffer, file.name, file.type, uploadedBy, {
        title: file.name,
      });
    });

    const results = await Promise.all(uploadPromises);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: true,
      uploaded: successful.length,
      failed: failed.length,
      media: successful.map(r => r.media).filter(Boolean),
      errors: failed.map(r => r.error),
    };
  } catch (error: any) {
    console.error('Error uploading media from client:', error);
    return {success: false, error: error.message};
  }
}
