import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Get Firestore instance
const db = admin.firestore();

// Note: You'll need to integrate with an email service like SendGrid, Mailgun, or Firebase Extensions
// For this example, we'll log the email content. In production, replace with actual email sending.

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(emailData: EmailData) {
  // TODO: Replace with actual email sending service
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(functions.config().sendgrid.key);
  // await sgMail.send(emailData);

  console.log('Email to send:', emailData);

  // For now, store in Firestore for manual sending or use Firebase Extension
  await db.collection('mail').add({
    ...emailData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'pending',
  });

  return {success: true};
}

/**
 * Send email notification when a new comment is posted
 */
export const sendCommentNotification = functions.firestore
  .document('comments/{commentId}')
  .onCreate(async (snapshot, context) => {
    const commentData = snapshot.data();
    const commentId = context.params.commentId;

    try {
      // Get the post
      const postDoc = await db.collection('posts').doc(commentData.postId).get();

      if (!postDoc.exists) {
        console.error('Post not found');
        return null;
      }

      const postData = postDoc.data()!;

      // Get post author
      const authorDoc = await db.collection('users').doc(postData.authorId).get();

      if (!authorDoc.exists) {
        console.error('Author not found');
        return null;
      }

      const authorData = authorDoc.data()!;

      // Send email to post author
      await sendEmail({
        to: authorData.email,
        subject: `New comment on your post: ${postData.title}`,
        html: `
          <h2>New Comment on "${postData.title}"</h2>
          <p><strong>From:</strong> ${commentData.authorName} (${commentData.authorEmail})</p>
          <p><strong>Comment:</strong></p>
          <blockquote>${commentData.content}</blockquote>
          <p><a href="${process.env.SITE_URL}/admin/comments">Moderate this comment</a></p>
        `,
        text: `New comment on "${postData.title}" from ${commentData.authorName}: ${commentData.content}`,
      });

      // If it's a reply, notify the parent comment author
      if (commentData.parentId) {
        const parentCommentDoc = await db.collection('comments').doc(commentData.parentId).get();

        if (parentCommentDoc.exists) {
          const parentCommentData = parentCommentDoc.data()!;

          await sendEmail({
            to: parentCommentData.authorEmail,
            subject: `Reply to your comment on: ${postData.title}`,
            html: `
              <h2>Someone replied to your comment</h2>
              <p><strong>Your comment:</strong></p>
              <blockquote>${parentCommentData.content}</blockquote>
              <p><strong>Reply from ${commentData.authorName}:</strong></p>
              <blockquote>${commentData.content}</blockquote>
              <p><a href="${process.env.SITE_URL}/blog/${postData.slug}#comment-${commentId}">View conversation</a></p>
            `,
          });
        }
      }

      console.log('Comment notification sent');
      return {success: true};
    } catch (error) {
      console.error('Error sending comment notification:', error);
      return null;
    }
  });

/**
 * Send welcome email when a new user is created
 */
export const sendUserWelcomeEmail = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    const userData = snapshot.data();

    try {
      await sendEmail({
        to: userData.email,
        subject: 'Welcome to Tour Insights Hub!',
        html: `
          <h1>Welcome ${userData.displayName}!</h1>
          <p>Thank you for joining Tour Insights Hub. Your account has been created with the role of <strong>${userData.role}</strong>.</p>
          <p>You can now:</p>
          <ul>
            ${userData.role !== 'subscriber' ? '<li>Create and manage content</li>' : ''}
            ${userData.role === 'admin' || userData.role === 'editor' ? '<li>Moderate comments</li>' : ''}
            ${userData.role === 'admin' ? '<li>Manage users and settings</li>' : ''}
            <li>Update your profile</li>
          </ul>
          <p><a href="${process.env.SITE_URL}/admin">Go to Admin Panel</a></p>
        `,
        text: `Welcome ${userData.displayName}! Your account has been created.`,
      });

      console.log('Welcome email sent');
      return {success: true};
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return null;
    }
  });

/**
 * Send notification when a post is published
 */
export const sendPostPublishedNotification = functions.firestore
  .document('posts/{postId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Only send if status changed to published
    if (beforeData.status !== 'published' && afterData.status === 'published') {
      try {
        // Get author
        const authorDoc = await db.collection('users').doc(afterData.authorId).get();

        if (!authorDoc.exists) {
          console.error('Author not found');
          return null;
        }

        const authorData = authorDoc.data()!;

        // Send email to author
        await sendEmail({
          to: authorData.email,
          subject: `Your post "${afterData.title}" has been published!`,
          html: `
            <h2>Your post is now live!</h2>
            <p>Your post "<strong>${afterData.title}</strong>" has been successfully published.</p>
            <p><a href="${process.env.SITE_URL}/blog/${afterData.slug}">View your post</a></p>
            <p>Share it on social media and let your audience know!</p>
          `,
          text: `Your post "${afterData.title}" has been published! View it at ${process.env.SITE_URL}/blog/${afterData.slug}`,
        });

        console.log('Post published notification sent');
        return {success: true};
      } catch (error) {
        console.error('Error sending post published notification:', error);
        return null;
      }
    }

    return null;
  });

/**
 * Send notification when a comment is approved
 */
export const sendCommentApprovedNotification = functions.firestore
  .document('comments/{commentId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Only send if status changed to approved
    if (beforeData.status !== 'approved' && afterData.status === 'approved') {
      try {
        // Get the post
        const postDoc = await db.collection('posts').doc(afterData.postId).get();

        if (!postDoc.exists) {
          console.error('Post not found');
          return null;
        }

        const postData = postDoc.data()!;

        await sendEmail({
          to: afterData.authorEmail,
          subject: `Your comment has been approved!`,
          html: `
            <h2>Your comment is now live!</h2>
            <p>Your comment on "<strong>${postData.title}</strong>" has been approved and is now visible to everyone.</p>
            <p><a href="${process.env.SITE_URL}/blog/${postData.slug}#comment-${context.params.commentId}">View your comment</a></p>
          `,
          text: `Your comment on "${postData.title}" has been approved!`,
        });

        console.log('Comment approved notification sent');
        return {success: true};
      } catch (error) {
        console.error('Error sending comment approved notification:', error);
        return null;
      }
    }

    return null;
  });
