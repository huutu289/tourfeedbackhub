import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Get Firestore instance
const db = admin.firestore();

/**
 * Cloud Function that runs every hour to check for scheduled posts
 * and publish them if their scheduled time has passed.
 */
export const publishScheduledPosts = functions.pubsub
  .schedule('every 5 minutes')
  .timeZone('UTC')
  .onRun(async context => {
    const now = admin.firestore.Timestamp.now();

    try {
      // Query for posts that are scheduled and due for publishing
      const scheduledPostsQuery = await db
        .collection('posts')
        .where('status', '==', 'scheduled')
        .where('scheduledFor', '<=', now)
        .get();

      if (scheduledPostsQuery.empty) {
        console.log('No scheduled posts to publish');
        return null;
      }

      console.log(`Found ${scheduledPostsQuery.size} posts to publish`);

      const batch = db.batch();

      scheduledPostsQuery.forEach(doc => {
        const postRef = db.collection('posts').doc(doc.id);

        batch.update(postRef, {
          status: 'published',
          publishedAt: now,
          updatedAt: now,
        });

        console.log(`Scheduled post ${doc.id} for publishing`);
      });

      await batch.commit();

      console.log(`Successfully published ${scheduledPostsQuery.size} posts`);

      return {
        published: scheduledPostsQuery.size,
        timestamp: now.toDate(),
      };
    } catch (error) {
      console.error('Error publishing scheduled posts:', error);
      throw error;
    }
  });

/**
 * Cloud Function that runs daily to clean up trashed posts older than 30 days
 */
export const cleanupTrashedPosts = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('UTC')
  .onRun(async context => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    try {
      // Query for trashed posts older than 30 days
      const trashedPostsQuery = await db
        .collection('posts')
        .where('status', '==', 'trash')
        .where('updatedAt', '<=', thirtyDaysAgo)
        .get();

      if (trashedPostsQuery.empty) {
        console.log('No trashed posts to delete');
        return null;
      }

      console.log(`Found ${trashedPostsQuery.size} trashed posts to delete`);

      const batch = db.batch();

      trashedPostsQuery.forEach(doc => {
        batch.delete(db.collection('posts').doc(doc.id));
        console.log(`Scheduled trashed post ${doc.id} for deletion`);
      });

      await batch.commit();

      console.log(`Successfully deleted ${trashedPostsQuery.size} trashed posts`);

      return {
        deleted: trashedPostsQuery.size,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error cleaning up trashed posts:', error);
      throw error;
    }
  });

/**
 * Cloud Function triggered when a post is updated
 * Updates category and tag counts
 */
export const updateTaxonomyCounts = functions.firestore
  .document('posts/{postId}')
  .onWrite(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only process published posts
    if (after?.status !== 'published' && before?.status !== 'published') {
      return null;
    }

    const beforeCategories = (before?.categoryIds || []) as string[];
    const afterCategories = (after?.categoryIds || []) as string[];

    const beforeTags = (before?.tagIds || []) as string[];
    const afterTags = (after?.tagIds || []) as string[];

    const batch = db.batch();

    // Handle categories
    const removedCategories = beforeCategories.filter(id => !afterCategories.includes(id));
    const addedCategories = afterCategories.filter(id => !beforeCategories.includes(id));

    for (const categoryId of removedCategories) {
      const categoryRef = db.collection('categories').doc(categoryId);
      batch.update(categoryRef, {
        count: admin.firestore.FieldValue.increment(-1),
      });
    }

    for (const categoryId of addedCategories) {
      const categoryRef = db.collection('categories').doc(categoryId);
      batch.update(categoryRef, {
        count: admin.firestore.FieldValue.increment(1),
      });
    }

    // Handle tags
    const removedTags = beforeTags.filter(id => !afterTags.includes(id));
    const addedTags = afterTags.filter(id => !beforeTags.includes(id));

    for (const tagId of removedTags) {
      const tagRef = db.collection('tags').doc(tagId);
      batch.update(tagRef, {
        count: admin.firestore.FieldValue.increment(-1),
      });
    }

    for (const tagId of addedTags) {
      const tagRef = db.collection('tags').doc(tagId);
      batch.update(tagRef, {
        count: admin.firestore.FieldValue.increment(1),
      });
    }

    if (removedCategories.length > 0 || addedCategories.length > 0 || removedTags.length > 0 || addedTags.length > 0) {
      await batch.commit();
      console.log('Updated taxonomy counts');
    }

    return null;
  });
