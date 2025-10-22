# CMS Deployment Guide

Complete guide to deploying Tour Insights Hub with all CMS features.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [Environment Configuration](#environment-configuration)
4. [Cloud Functions Deployment](#cloud-functions-deployment)
5. [Firestore Security Rules](#firestore-security-rules)
6. [Storage Configuration](#storage-configuration)
7. [Email Service Setup](#email-service-setup)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- Node.js 18+ and npm
- Firebase CLI: `npm install -g firebase-tools`
- Git

### Required Accounts
- Firebase/Google Cloud account
- (Optional) SendGrid/Mailgun for emails
- (Optional) Algolia for advanced search

---

## Firebase Setup

### 1. Create Firebase Project

```bash
# Login to Firebase
firebase login

# Create new project (or use existing)
firebase projects:create tourfeedbackhub

# Select project
firebase use tourfeedbackhub
```

### 2. Enable Firebase Services

In Firebase Console (https://console.firebase.google.com):

1. **Authentication**
   - Enable Email/Password provider
   - Enable Anonymous auth (optional)
   - Configure authorized domains

2. **Firestore Database**
   - Create database in production mode
   - Select region (choose closest to your users)

3. **Storage**
   - Enable Cloud Storage
   - Select same region as Firestore

4. **App Check**
   - Enable App Check
   - Add reCAPTCHA v3 for web

5. **Functions**
   - Upgrade to Blaze (pay-as-you-go) plan for Cloud Functions

### 3. Create Web App

```bash
# In Firebase Console, add a new Web App
# Copy the config and save for environment variables
```

### 4. Service Account

```bash
# Generate service account key
# Firebase Console → Project Settings → Service Accounts
# Click "Generate New Private Key"
# Save the JSON file securely (DO NOT commit to git)
```

---

## Environment Configuration

### 1. Create Environment Files

Create `.env.local` in project root:

```env
# Firebase Client Config (from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin (from Service Account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Site Config
NEXT_PUBLIC_SITE_URL=http://localhost:9002
SITE_URL=http://localhost:9002

# (Optional) Email Service
SENDGRID_API_KEY=your-sendgrid-key
```

### 2. Production Environment

For Firebase App Hosting or other platforms, set these as environment variables in your deployment settings.

---

## Cloud Functions Deployment

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Functions

Update `functions/package.json`:

```json
{
  "engines": {
    "node": "18"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  }
}
```

### 3. Build and Deploy

```bash
# Build TypeScript
npm run build

# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:publishScheduledPosts
firebase deploy --only functions:sendCommentNotification
```

### 4. Set Function Environment Variables

```bash
# Set site URL for email links
firebase functions:config:set site.url="https://yoursite.com"

# (Optional) Set SendGrid API key
firebase functions:config:set sendgrid.key="your-api-key"

# View config
firebase functions:config:get
```

---

## Firestore Security Rules

### 1. Review Rules

Check `firestore.rules` for security rules covering:
- Posts (published posts public, authors can edit own)
- Categories & Tags (public read, admin write)
- Media (public read, users can upload, authors can delete own)
- Comments (approved comments public, anyone can create pending)
- Users (authenticated users can read, admins can manage)

### 2. Deploy Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Test Rules

Use Firebase Console → Firestore → Rules → Simulator to test:

```javascript
// Test reading published post (should succeed)
get /databases/$(database)/documents/posts/somePostId
// Auth: Unauthenticated

// Test creating post (should succeed for authenticated)
create /databases/$(database)/documents/posts/newPostId
// Auth: Authenticated user

// Test deleting another user's post (should fail)
delete /databases/$(database)/documents/posts/somePostId
// Auth: Different user
```

---

## Storage Configuration

### 1. Storage Rules

Create `storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /media/{fileName} {
      // Allow public read
      allow read: if true;

      // Allow authenticated users to upload
      allow create: if request.auth != null
                    && request.resource.size < 10 * 1024 * 1024  // 10MB limit
                    && request.resource.contentType.matches('image/.*|video/.*|audio/.*|application/pdf');

      // Allow users to delete their own uploads
      allow delete: if request.auth != null
                    && (request.auth.token.admin == true || resource.metadata.uploadedBy == request.auth.uid);
    }
  }
}
```

### 2. Deploy Storage Rules

```bash
firebase deploy --only storage
```

### 3. Configure CORS

Create `cors.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:

```bash
gsutil cors set cors.json gs://your-project.appspot.com
```

---

## Email Service Setup

### Option 1: Firebase Extensions (Recommended)

```bash
# Install Trigger Email extension
firebase ext:install firebase/firestore-send-email

# Configure during installation:
# - Collection: mail
# - Email field: to
# - Subject field: subject
# - HTML field: html
# - SMTP settings (use SendGrid, Mailgun, or Gmail)
```

### Option 2: SendGrid Integration

1. Sign up at https://sendgrid.com
2. Create API key
3. Add to Functions config:

```bash
firebase functions:config:set sendgrid.key="YOUR_API_KEY"
```

4. Install SendGrid in functions:

```bash
cd functions
npm install @sendgrid/mail
```

5. Update `functions/src/email-notifications.ts` to use SendGrid

### Option 3: Custom SMTP

Use nodemailer in Cloud Functions:

```bash
cd functions
npm install nodemailer
```

---

## Testing

### 1. Local Testing

```bash
# Start Firebase Emulators
firebase emulators:start

# In another terminal, run Next.js
npm run dev

# Access at http://localhost:9002
# Emulator UI at http://localhost:4000
```

### 2. Test CMS Features

#### Create First Admin User:

1. Sign up through the app or create manually in Firebase Console
2. Get user UID from Authentication
3. Add to Firestore `users` collection:

```javascript
{
  email: "admin@example.com",
  displayName: "Admin User",
  role: "admin",
  status: "active",
  createdAt: now()
}
```

4. Set custom claims in Firebase Console or via script:

```javascript
// In Firebase Console Cloud Functions or Admin SDK
admin.auth().setCustomUserClaims(uid, { role: 'admin', admin: true });
```

#### Test Workflows:

1. **Create Post**
   - Login as admin
   - Go to /admin/posts/new
   - Fill form and publish
   - Verify post appears on blog

2. **Upload Media**
   - Upload image through Media Library
   - Verify it appears in Storage
   - Verify Firestore document created

3. **Manage Comments**
   - Submit comment on post
   - Check admin panel for pending comment
   - Approve comment
   - Verify email notification sent

4. **Scheduled Publishing**
   - Create post with scheduled date
   - Wait for scheduled time (or trigger function manually)
   - Verify post published automatically

---

## Production Deployment

### 1. Build Application

```bash
npm run build
```

### 2. Deploy to Firebase App Hosting

```bash
# Initialize App Hosting
firebase apphosting:backends:create

# Deploy
firebase deploy --only hosting
```

### 3. Or Deploy to Vercel/Other Platform

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Add environment variables in Vercel dashboard
```

### 4. Update Firebase Authorized Domains

In Firebase Console → Authentication → Settings:
- Add your production domain to authorized domains

### 5. Update Environment Variables

Set production URLs:
- `NEXT_PUBLIC_SITE_URL=https://yoursite.com`
- `SITE_URL=https://yoursite.com`
- Update CORS settings if needed

---

## Post-Deployment

### 1. Create Initial Content

```bash
# Create categories
# Create tags
# Upload media
# Create first posts
```

### 2. Set Up Monitoring

1. **Cloud Functions Logs**
   ```bash
   firebase functions:log
   ```

2. **Firestore Usage**
   - Monitor in Firebase Console
   - Set up budget alerts

3. **Storage Usage**
   - Monitor file uploads
   - Set up cleanup rules for old files

### 3. Performance Optimization

1. **Enable CDN** for Storage
2. **Configure caching** headers
3. **Set up indexes** for Firestore queries:

```bash
firebase deploy --only firestore:indexes
```

4. **Optimize images** on upload (add to media upload function)

---

## Troubleshooting

### Common Issues

#### 1. "Permission denied" errors

**Problem**: Firestore rules blocking requests

**Solution**:
- Check rules in Console
- Verify user authentication
- Check custom claims for admin users

#### 2. Cloud Functions not triggering

**Problem**: Functions not executing

**Solution**:
```bash
# Check function logs
firebase functions:log

# Redeploy functions
firebase deploy --only functions

# Check function status
firebase functions:list
```

#### 3. Media upload failing

**Problem**: Storage permissions or CORS

**Solution**:
```bash
# Check storage rules
firebase deploy --only storage

# Update CORS
gsutil cors set cors.json gs://your-bucket
```

#### 4. Emails not sending

**Problem**: Email service not configured

**Solution**:
- Check Firebase Extension status
- Verify SMTP credentials
- Check Functions logs for errors

#### 5. Search not working

**Problem**: Firestore full-text search limitations

**Solution**:
- Use Algolia for production search
- Or implement basic keyword matching (current implementation)

---

## Security Checklist

Before going live:

- [ ] Firestore rules deployed and tested
- [ ] Storage rules deployed and tested
- [ ] App Check enabled
- [ ] Environment variables secured (not in git)
- [ ] Service account key secured
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Admin users properly set up
- [ ] Rate limiting configured (if needed)
- [ ] Backup strategy in place

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor error logs
- Check comment queue

**Weekly**:
- Review user activity
- Clean up trashed posts (automatic via function)
- Check storage usage

**Monthly**:
- Review Firebase costs
- Update dependencies
- Review security rules

### Backup Strategy

```bash
# Export Firestore data
gcloud firestore export gs://your-bucket/backups

# Schedule automated backups
# Use Cloud Scheduler + Cloud Functions
```

---

## Support Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Project Issues**: https://github.com/your-repo/issues
- **Firebase Support**: https://firebase.google.com/support

---

## Quick Commands Reference

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only hosting

# Local development
npm run dev
firebase emulators:start

# Logs
firebase functions:log
firebase functions:log --only publishScheduledPosts

# Database
firebase firestore:delete --all-collections  # DANGEROUS!

# Functions config
firebase functions:config:get
firebase functions:config:set key="value"
```

---

**Deployment Complete!** Your CMS is now live with all WordPress-like features.

For questions or issues, refer to the documentation or create an issue in the repository.
