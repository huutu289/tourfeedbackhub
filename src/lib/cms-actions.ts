'use server';

import {initializeApp, getApps, cert} from 'firebase-admin/app';
import {getFirestore, Timestamp as AdminTimestamp} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {z} from 'zod';
import type {
  Post,
  PostStatus,
  Category,
  Tag,
  Comment,
  User,
  UserRole,
  ThemeSettings,
} from './types';

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

// ============================================================================
// POST ACTIONS
// ============================================================================

const postSchema = z.object({
  type: z.enum(['post', 'page']),
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string(),
  excerpt: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'private', 'trash']),
  featuredImageId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  allowComments: z.boolean().optional(),
  scheduledFor: z.string().optional(), // ISO date string
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      focusKeyword: z.string().optional(),
      canonicalUrl: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      ogImage: z.string().optional(),
      twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
      noindex: z.boolean().optional(),
      nofollow: z.boolean().optional(),
    })
    .optional(),
});

export async function createPost(data: z.infer<typeof postSchema>, authorId: string) {
  try {
    const validatedData = postSchema.parse(data);

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const postData = {
      ...validatedData,
      authorId,
      scheduledFor: validatedData.scheduledFor
        ? AdminTimestamp.fromDate(new Date(validatedData.scheduledFor))
        : null,
      createdAt: AdminTimestamp.now(),
      updatedAt: AdminTimestamp.now(),
      publishedAt:
        validatedData.status === 'published' ? AdminTimestamp.now() : null,
      viewCount: 0,
      commentCount: 0,
    };

    const docRef = await db.collection('posts').add(postData);

    // Create initial revision
    await db
      .collection('posts')
      .doc(docRef.id)
      .collection('revisions')
      .add({
        title: validatedData.title,
        content: validatedData.content,
        excerpt: validatedData.excerpt,
        authorId,
        createdAt: AdminTimestamp.now(),
        changeNote: 'Initial version',
      });

    return {success: true, postId: docRef.id};
  } catch (error: any) {
    console.error('Error creating post:', error);
    return {success: false, error: error.message};
  }
}

export async function updatePost(
  postId: string,
  data: Partial<z.infer<typeof postSchema>>,
  authorId: string
) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return {success: false, error: 'Post not found'};
    }

    const updateData: any = {
      ...data,
      updatedAt: AdminTimestamp.now(),
    };

    // Set publishedAt if status changes to published
    if (data.status === 'published' && postDoc.data()?.status !== 'published') {
      updateData.publishedAt = AdminTimestamp.now();
    }

    // Handle scheduled date
    if (data.scheduledFor) {
      updateData.scheduledFor = AdminTimestamp.fromDate(new Date(data.scheduledFor));
    }

    await postRef.update(updateData);

    // Create revision if content changed
    if (data.title || data.content || data.excerpt) {
      await postRef.collection('revisions').add({
        title: data.title || postDoc.data()?.title,
        content: data.content || postDoc.data()?.content,
        excerpt: data.excerpt || postDoc.data()?.excerpt,
        authorId,
        createdAt: AdminTimestamp.now(),
        changeNote: 'Updated',
      });
    }

    return {success: true, postId};
  } catch (error: any) {
    console.error('Error updating post:', error);
    return {success: false, error: error.message};
  }
}

export async function deletePost(postId: string) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    await db.collection('posts').doc(postId).delete();

    return {success: true};
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return {success: false, error: error.message};
  }
}

export async function getPost(postId: string) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const postDoc = await db.collection('posts').doc(postId).get();

    if (!postDoc.exists) {
      return {success: false, error: 'Post not found'};
    }

    return {
      success: true,
      post: {
        id: postDoc.id,
        ...postDoc.data(),
      },
    };
  } catch (error: any) {
    console.error('Error getting post:', error);
    return {success: false, error: error.message};
  }
}

export async function getPosts(filters?: {
  type?: 'post' | 'page';
  status?: PostStatus;
  authorId?: string;
  limit?: number;
}) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    let postsQuery = db.collection('posts').orderBy('createdAt', 'desc');

    if (filters?.type) {
      postsQuery = postsQuery.where('type', '==', filters.type) as any;
    }
    if (filters?.status) {
      postsQuery = postsQuery.where('status', '==', filters.status) as any;
    }
    if (filters?.authorId) {
      postsQuery = postsQuery.where('authorId', '==', filters.authorId) as any;
    }
    if (filters?.limit) {
      postsQuery = postsQuery.limit(filters.limit) as any;
    }

    const snapshot = await postsQuery.get();
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {success: true, posts};
  } catch (error: any) {
    console.error('Error getting posts:', error);
    return {success: false, error: error.message};
  }
}

// ============================================================================
// CATEGORY ACTIONS
// ============================================================================

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().optional(),
});

export async function createCategory(data: z.infer<typeof categorySchema>) {
  try {
    const validatedData = categorySchema.parse(data);

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const categoryData = {
      ...validatedData,
      count: 0,
      createdAt: AdminTimestamp.now(),
      updatedAt: AdminTimestamp.now(),
    };

    const docRef = await db.collection('categories').add(categoryData);

    return {success: true, categoryId: docRef.id};
  } catch (error: any) {
    console.error('Error creating category:', error);
    return {success: false, error: error.message};
  }
}

export async function updateCategory(
  categoryId: string,
  data: Partial<z.infer<typeof categorySchema>>
) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    await db
      .collection('categories')
      .doc(categoryId)
      .update({
        ...data,
        updatedAt: AdminTimestamp.now(),
      });

    return {success: true, categoryId};
  } catch (error: any) {
    console.error('Error updating category:', error);
    return {success: false, error: error.message};
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    await db.collection('categories').doc(categoryId).delete();

    return {success: true};
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return {success: false, error: error.message};
  }
}

export async function getCategories() {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const snapshot = await db.collection('categories').orderBy('name').get();
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {success: true, categories};
  } catch (error: any) {
    console.error('Error getting categories:', error);
    return {success: false, error: error.message};
  }
}

// ============================================================================
// TAG ACTIONS
// ============================================================================

const tagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
});

export async function createTag(data: z.infer<typeof tagSchema>) {
  try {
    const validatedData = tagSchema.parse(data);

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const tagData = {
      ...validatedData,
      count: 0,
      createdAt: AdminTimestamp.now(),
    };

    const docRef = await db.collection('tags').add(tagData);

    return {success: true, tagId: docRef.id};
  } catch (error: any) {
    console.error('Error creating tag:', error);
    return {success: false, error: error.message};
  }
}

export async function updateTag(tagId: string, data: Partial<z.infer<typeof tagSchema>>) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    await db.collection('tags').doc(tagId).update(data);

    return {success: true, tagId};
  } catch (error: any) {
    console.error('Error updating tag:', error);
    return {success: false, error: error.message};
  }
}

export async function deleteTag(tagId: string) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    await db.collection('tags').doc(tagId).delete();

    return {success: true};
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    return {success: false, error: error.message};
  }
}

export async function getTags() {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const snapshot = await db.collection('tags').orderBy('name').get();
    const tags = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {success: true, tags};
  } catch (error: any) {
    console.error('Error getting tags:', error);
    return {success: false, error: error.message};
  }
}

// ============================================================================
// COMMENT ACTIONS
// ============================================================================

const commentSchema = z.object({
  postId: z.string(),
  postType: z.enum(['post', 'page']),
  authorName: z.string().min(1, 'Name is required'),
  authorEmail: z.string().email('Valid email is required'),
  authorUrl: z.string().optional(),
  content: z.string().min(1, 'Comment is required'),
  parentId: z.string().nullable().optional(),
});

export async function createComment(data: z.infer<typeof commentSchema>) {
  try {
    const validatedData = commentSchema.parse(data);

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const commentData = {
      ...validatedData,
      status: 'pending',
      createdAt: AdminTimestamp.now(),
      updatedAt: AdminTimestamp.now(),
    };

    const docRef = await db.collection('comments').add(commentData);

    // Increment comment count on post
    const postRef = db.collection('posts').doc(validatedData.postId);
    await postRef.update({
      commentCount: (await postRef.get()).data()?.commentCount || 0 + 1,
    });

    return {success: true, commentId: docRef.id};
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return {success: false, error: error.message};
  }
}

export async function updateCommentStatus(
  commentId: string,
  status: 'pending' | 'approved' | 'spam' | 'trash'
) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    await db.collection('comments').doc(commentId).update({
      status,
      updatedAt: AdminTimestamp.now(),
    });

    return {success: true};
  } catch (error: any) {
    console.error('Error updating comment status:', error);
    return {success: false, error: error.message};
  }
}

export async function deleteComment(commentId: string) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const commentDoc = await db.collection('comments').doc(commentId).get();
    if (commentDoc.exists) {
      const postRef = db.collection('posts').doc(commentDoc.data()?.postId);
      await postRef.update({
        commentCount: Math.max(0, ((await postRef.get()).data()?.commentCount || 1) - 1),
      });
    }

    await db.collection('comments').doc(commentId).delete();

    return {success: true};
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return {success: false, error: error.message};
  }
}

export async function getComments(filters?: {postId?: string; status?: string; limit?: number}) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    let commentsQuery = db.collection('comments').orderBy('createdAt', 'desc');

    if (filters?.postId) {
      commentsQuery = commentsQuery.where('postId', '==', filters.postId) as any;
    }
    if (filters?.status) {
      commentsQuery = commentsQuery.where('status', '==', filters.status) as any;
    }
    if (filters?.limit) {
      commentsQuery = commentsQuery.limit(filters.limit) as any;
    }

    const snapshot = await commentsQuery.get();
    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {success: true, comments};
  } catch (error: any) {
    console.error('Error getting comments:', error);
    return {success: false, error: error.message};
  }
}

// ============================================================================
// USER ACTIONS
// ============================================================================

export async function createUser(email: string, displayName: string, role: UserRole) {
  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      displayName,
      emailVerified: false,
    });

    // Set custom claims for role
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      admin: role === 'admin',
    });

    // Create user document in Firestore
    await db
      .collection('users')
      .doc(userRecord.uid)
      .set({
        email,
        displayName,
        role,
        status: 'active',
        createdAt: AdminTimestamp.now(),
      });

    return {success: true, userId: userRecord.uid};
  } catch (error: any) {
    console.error('Error creating user:', error);
    return {success: false, error: error.message, code: error?.code};
  }
}

export async function updateUserRole(userId: string, role: UserRole) {
  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    // Update custom claims
    await auth.setCustomUserClaims(userId, {
      role,
      admin: role === 'admin',
    });

    // Update Firestore document
    await db.collection('users').doc(userId).update({
      role,
      updatedAt: AdminTimestamp.now(),
    });

    return {success: true};
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return {success: false, error: error.message};
  }
}

export async function updateUserStatus(userId: string, status: 'active' | 'inactive' | 'banned') {
  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    // Disable/enable user in Firebase Auth
    await auth.updateUser(userId, {
      disabled: status === 'banned' || status === 'inactive',
    });

    // Update Firestore document
    await db.collection('users').doc(userId).update({
      status,
      updatedAt: AdminTimestamp.now(),
    });

    return {success: true};
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return {success: false, error: error.message};
  }
}

export async function updateUserDetails(
  userId: string,
  updates: {
    displayName?: string;
    role?: UserRole;
    status?: User['status'];
    avatarUrl?: string | null;
    bio?: string | null;
    website?: string | null;
    socialLinks?: User['socialLinks'] | null;
    permissions?: string[];
  }
) {
  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    const firestoreUpdates: Record<string, unknown> = {
      updatedAt: AdminTimestamp.now(),
    };
    const authUpdates: Parameters<typeof auth.updateUser>[1] = {};

    if (typeof updates.displayName === 'string') {
      firestoreUpdates.displayName = updates.displayName;
      authUpdates.displayName = updates.displayName;
    }

    if (updates.status) {
      firestoreUpdates.status = updates.status;
      authUpdates.disabled = updates.status === 'banned' || updates.status === 'inactive';
    }

    if (typeof updates.avatarUrl !== 'undefined') {
      firestoreUpdates.avatarUrl = updates.avatarUrl ?? null;
    }
    if (typeof updates.bio !== 'undefined') {
      firestoreUpdates.bio = updates.bio ?? null;
    }
    if (typeof updates.website !== 'undefined') {
      firestoreUpdates.website = updates.website ?? null;
    }
    if (typeof updates.socialLinks !== 'undefined') {
      firestoreUpdates.socialLinks = updates.socialLinks ?? null;
    }
    if (typeof updates.permissions !== 'undefined') {
      firestoreUpdates.permissions = updates.permissions;
    }

    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(userId, authUpdates);
    }

    if (updates.role) {
      const userRecord = await auth.getUser(userId);
      const existingClaims = userRecord.customClaims ?? {};
      const claims = {
        ...existingClaims,
        role: updates.role,
        admin: updates.role === 'admin',
      };
      firestoreUpdates.role = updates.role;
      await auth.setCustomUserClaims(userId, claims);
    }

    await db.collection('users').doc(userId).set(firestoreUpdates, {merge: true});

    return {success: true};
  } catch (error: any) {
    console.error('Error updating user details:', error);
    return {success: false, error: error.message};
  }
}

export async function deleteUser(userId: string) {
  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    // Delete from Firestore
    await db.collection('users').doc(userId).delete();

    return {success: true};
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return {success: false, error: error.message};
  }
}

// ============================================================================
// THEME SETTINGS ACTIONS
// ============================================================================

export async function updateThemeSettings(settings: ThemeSettings) {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    await db.collection('themeSettings').doc('default').set(
      {
        ...settings,
        updatedAt: AdminTimestamp.now(),
      },
      {merge: true}
    );

    return {success: true};
  } catch (error: any) {
    console.error('Error updating theme settings:', error);
    return {success: false, error: error.message};
  }
}

export async function getThemeSettings() {
  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const doc = await db.collection('themeSettings').doc('default').get();

    if (!doc.exists) {
      return {success: true, settings: null};
    }

    return {success: true, settings: doc.data()};
  } catch (error: any) {
    console.error('Error getting theme settings:', error);
    return {success: false, error: error.message};
  }
}
