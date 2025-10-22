# TourFeedbackHub - Phase 1 Setup Guide

Complete step-by-step guide to deploy Phase 1 from scratch.

## Prerequisites

- Node.js 20+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project created: `tourfeedbackhub-474704`
- Billing enabled on Firebase project

## Part 1: Firebase Console Configuration

### 1.1 Enable Required Services

1. Go to [Firebase Console](https://console.firebase.google.com/project/tourfeedbackhub-474704)

2. **Firestore**
   - Go to Firestore Database
   - Click "Create Database"
   - Choose production mode
   - Select location (us-central1 recommended)

3. **Storage**
   - Go to Storage
   - Click "Get Started"
   - Choose same location as Firestore

4. **Authentication**
   - Go to Authentication
   - Enable Email/Password provider
   - Enable Anonymous provider (optional for future)

### 1.2 Set Up reCAPTCHA Enterprise

1. Go to [Google Cloud Console](https://console.cloud.google.com/security/recaptcha?project=tourfeedbackhub-474704)

2. Click "CREATE KEY"
   - Display name: `TourFeedbackHub Web`
   - Platform type: `Website`
   - Domain: Add your domain(s)
     - For development: `localhost`
     - For production: `your-domain.com`
   - Integration type: `Score-based`
   - Click "CREATE"

3. **Save the Site Key** - you'll need it for `.env.local`

4. **Create API Key**
   - Go to [API & Services > Credentials](https://console.cloud.google.com/apis/credentials?project=tourfeedbackhub-474704)
   - Click "CREATE CREDENTIALS" > "API Key"
   - **Restrict the API key**:
     - Application restrictions: None (or HTTP referrers for production)
     - API restrictions: Select "reCAPTCHA Enterprise API"
   - **Save the API Key** - you'll need it for Functions config

### 1.3 Set Up App Check

1. Go to Firebase Console > App Check
2. Click "Get Started"
3. Register your web app:
   - App: Select your web app (create one if needed)
   - Provider: reCAPTCHA Enterprise
   - Site key: Use the key from step 1.2
4. Click "Save"

### 1.4 Set Up GA4 (Optional but recommended)

1. Go to Firebase Console > Analytics
2. Click "Enable Google Analytics"
3. Create or select GA4 property
4. **Save the Measurement ID** (format: `G-XXXXXXXXXX`)

### 1.5 Create Admin User

1. Go to Firebase Console > Authentication > Users
2. Click "Add User"
   - Email: your-email@example.com
   - Password: (create a strong password)
3. **Save the UID** of this user

## Part 2: Local Environment Setup

### 2.1 Clone and Install

```bash
cd /media/data/tourfeedbackhub

# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
npm run build
cd ..
```

### 2.2 Configure Environment Variables

Create/update `.env.local`:

```env
# Firebase App Check - reCAPTCHA Enterprise Site Key
NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY=your-recaptcha-site-key-from-1.2

# Cloud Functions Base URL (update with your project ID)
# Development:
NEXT_PUBLIC_CLOUD_FUNCTIONS_BASE_URL=http://localhost:5001/tourfeedbackhub-474704/us-central1

# Production (update after deploying functions):
# NEXT_PUBLIC_CLOUD_FUNCTIONS_BASE_URL=https://us-central1-tourfeedbackhub-474704.cloudfunctions.net

# GA4 Measurement ID (if using Analytics)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 2.3 Configure Cloud Functions Environment

```bash
firebase functions:config:set \
  recaptcha.site_key="your-recaptcha-site-key-from-1.2" \
  recaptcha.api_key="your-recaptcha-api-key-from-1.2"
```

## Part 3: Initial Firestore Data

### 3.1 Add Admin User to Firestore

```bash
# Edit the script with your admin UID
nano scripts/add-admin-users.js
```

Update the `adminUsers` array with your UID from step 1.5.

Run the script:
```bash
node scripts/add-admin-users.js
```

### 3.2 Add Sample Data (Optional)

Create a file `scripts/seed-data.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedData() {
  // Add site settings
  await db.collection('site_settings').doc('default').set({
    primaryColor: '#77B5FE',
    backgroundColor: '#F0F8FF',
    accentColor: '#4682B4',
    fontHeadline: 'Playfair',
    fontBody: 'PT Sans'
  });

  // Add tour types
  await db.collection('tour_types').add({
    name: 'City Tours',
    description: 'Explore historic cities and landmarks'
  });

  // Add sample tour
  await db.collection('tours').add({
    name: 'Rome Historic Center',
    typeId: 'city-tours',
    description: 'Discover ancient Rome',
    teaser: 'Walk through 2000 years of history',
    imageUrl: null
  });

  console.log('Seed data added successfully');
}

seedData();
```

## Part 4: Deploy to Firebase

### 4.1 Login to Firebase

```bash
firebase login
firebase use tourfeedbackhub-474704
```

### 4.2 Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules
```

### 4.3 Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

⚠️ **Important**: After deploying functions, update `.env.local` with the production Cloud Functions URL.

### 4.4 Build and Deploy Next.js

```bash
# Build Next.js
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Part 5: Testing

### 5.1 Local Testing with Emulators

```bash
# Terminal 1: Start Firebase Emulators
firebase emulators:start

# Terminal 2: Start Next.js dev server
npm run dev
```

Access:
- Next.js app: http://localhost:9002
- Firebase Emulator UI: http://localhost:4000
- Functions: http://localhost:5001

### 5.2 Test Feedback Submission

1. Go to http://localhost:9002/feedback
2. Fill out the form
3. Submit (should pass reCAPTCHA)
4. Check Firestore Emulator UI for new feedback document

### 5.3 Test Admin Approval

1. Go to http://localhost:9002/admin/login
2. Login with admin credentials
3. Go to /admin/reviews
4. Approve/reject pending feedback
5. Check that review appears on /reviews page

## Part 6: Production Deployment

### 6.1 Update Environment for Production

Update `.env.local`:

```env
NEXT_PUBLIC_CLOUD_FUNCTIONS_BASE_URL=https://us-central1-tourfeedbackhub-474704.cloudfunctions.net
```

### 6.2 Build for Production

```bash
NODE_ENV=production npm run build
```

### 6.3 Deploy Everything

```bash
firebase deploy
```

This deploys:
- Firestore rules
- Storage rules
- Cloud Functions
- Hosting (Next.js build)

### 6.4 Configure Custom Domain (Optional)

1. Go to Firebase Console > Hosting
2. Click "Add Custom Domain"
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (can take 24 hours)
5. Update App Check and reCAPTCHA allowed domains

## Part 7: Verification Checklist

- [ ] Can submit feedback anonymously
- [ ] reCAPTCHA appears and validates
- [ ] Feedback appears in Firestore with "pending" status
- [ ] Photo upload works (if included)
- [ ] Admin can login
- [ ] Admin can see pending feedback
- [ ] Admin can approve feedback
- [ ] Approved feedback appears in public reviews
- [ ] PII is removed from approved reviews
- [ ] Admin can reject feedback
- [ ] Rejected feedback doesn't appear publicly
- [ ] Temporary photos are deleted on rejection
- [ ] App Check is blocking unauthorized requests
- [ ] GA4 events are being tracked (if enabled)

## Troubleshooting

### Issue: "App Check verification failed"
**Solution**: Make sure you've enabled App Check in Firebase Console and added the site key to `.env.local`

### Issue: "reCAPTCHA verification failed"
**Solution**:
- Check that the site key and API key are correct
- Verify domain is added to allowed domains in reCAPTCHA Console
- Check Functions environment config: `firebase functions:config:get`

### Issue: "Unauthorized" when approving feedback
**Solution**:
- Verify your user document in `/users` lists `role: "admin"`
- Check that custom claims script ran successfully: `node scripts/add-admin-users.js`
- Check browser console for auth errors

### Issue: Functions not deploying
**Solution**:
- Run `cd functions && npm run build` first
- Check for TypeScript errors
- Verify billing is enabled on Firebase project
- Check Cloud Functions quota

### Issue: Photos not uploading
**Solution**:
- Check Storage rules are deployed
- Verify signed URL is not expired (15 min TTL)
- Check file size < 5MB
- Check file type is JPEG/PNG/WebP/HEIC

## Next Steps After Deployment

1. **Content**:
   - Add tour content via admin panel
   - Upload tour photos to Storage
   - Create initial blog posts/stories

2. **SEO**:
   - Submit sitemap to Google Search Console
   - Configure Google Business Profile
   - Add meta tags and OG images

3. **Analytics**:
   - Set up GA4 custom events
   - Configure conversion tracking
   - Create dashboards

4. **Monitoring**:
   - Set up Firebase Alerts
   - Monitor Cloud Functions logs
   - Track error rates

5. **Optional Enhancements**:
   - Email notifications for new feedback
   - AI summarization with Genkit
   - Multi-language support (i18n)
   - Tripadvisor/Google Reviews widgets

## Support

For issues or questions:
- Check logs: `firebase functions:log`
- Firebase Console: https://console.firebase.google.com/project/tourfeedbackhub-474704
- Google Cloud Console: https://console.cloud.google.com/home/dashboard?project=tourfeedbackhub-474704
