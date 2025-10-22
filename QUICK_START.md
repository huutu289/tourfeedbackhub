# 🚀 Quick Start Guide - Tour Insights Hub CMS

## Current Status: ✅ DEPLOYED

All backend services are deployed and running. You just need to set up your local environment.

---

## Step 1: Get Firebase Credentials

### A. Download Service Account Key (Required for Admin Script)

1. Go to: https://console.firebase.google.com/project/tourfeedbackhub-474704/settings/serviceaccounts/adminsdk

2. Click **"Generate new private key"**

3. Click **"Generate key"** in the popup

4. Save the JSON file somewhere safe (e.g., `~/Downloads/tourfeedbackhub-474704-xxxxx.json`)

### B. Get Web App Config (Required for Frontend)

1. Go to: https://console.firebase.google.com/project/tourfeedbackhub-474704/settings/general

2. Scroll down to **"Your apps"**

3. Find your Web app and click the **config** icon (looks like `</>`)

4. Copy the config values:
   ```javascript
   apiKey: "AIza..."
   authDomain: "tourfeedbackhub-474704.firebaseapp.com"
   projectId: "tourfeedbackhub-474704"
   storageBucket: "tourfeedbackhub-474704.appspot.com"
   messagingSenderId: "..."
   appId: "..."
   ```

---

## Step 2: Create .env.local File

### Option A: Use Helper Script (Recommended)

```bash
# Run the interactive setup script
bash scripts/setup-env.sh

# Follow the prompts:
# - Point to your downloaded JSON file
# - OR paste values manually
# - Enter web app config values
```

### Option B: Manual Setup

```bash
# Copy the template
cp .env.local.template .env.local

# Edit with your favorite editor
nano .env.local
# or
code .env.local
# or
vim .env.local
```

Fill in these values:

```env
# From Service Account JSON file:
FIREBASE_PROJECT_ID=tourfeedbackhub-474704
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tourfeedbackhub-474704.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"

# From Web App Config:
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:xxxxx
```

**Important**: The `FIREBASE_PRIVATE_KEY` must be in quotes and keep the `\n` characters as-is!

---

## Step 3: Create Your First Admin User

```bash
node scripts/create-admin-user.js
```

You'll be prompted for:
- **Email**: (e.g., admin@yoursite.com)
- **Display Name**: (e.g., Admin User)
- **Password**: (min 6 characters)

Example:
```
=== Create Admin User for Tour Insights Hub CMS ===

Enter admin email: admin@example.com
Enter display name: Admin User
Enter password (min 6 characters): admin123

Creating user...
✓ Created Auth user with UID: abc123xyz
✓ Set custom claims (role: admin)
✓ Created Firestore user document

🎉 Admin user created successfully!

Email: admin@example.com
You can now login at: http://localhost:9002/admin/login
```

---

## Step 4: Start Development Server

```bash
npm run dev
```

Server will start at: **http://localhost:9002**

---

## Step 5: Login to Admin Panel

1. Open: **http://localhost:9002/admin/login**

2. Enter credentials you just created:
   - Email: admin@example.com
   - Password: admin123

3. You should be redirected to: **http://localhost:9002/admin/dashboard**

---

## Step 6: Explore Your CMS

### Try These Features:

#### 📝 Create a Post
- Go to `/admin/posts`
- Click "New Post"
- Fill in title, content, categories
- Click "Publish"
- View at `/blog/your-post-slug`

#### 🖼️ Upload Media
- In post editor, click "Set Featured Image"
- Click "Upload Files"
- Select images
- They're saved to Firebase Storage!

#### 📂 Manage Categories
- Go to `/admin/categories`
- Click "New Category"
- Create hierarchical categories

#### 🏷️ Manage Tags
- Go to `/admin/tags`
- Create tags for organizing content

#### 💬 Test Comments
- View a published post (public site)
- Submit a comment
- Go to `/admin/comments` to moderate
- Approve the comment

#### 🎨 Customize Theme
- Go to `/admin/appearance`
- Change colors, fonts
- Add custom CSS
- Save changes

#### 👥 Manage Users
- Go to `/admin/users`
- Create users with different roles:
  - **Admin**: Full access
  - **Editor**: Can manage all posts
  - **Author**: Can publish own posts
  - **Contributor**: Can write, not publish
  - **Subscriber**: Read-only

#### 📊 View Analytics
- Go to `/admin/analytics`
- See page views, top posts, traffic sources

#### 🔍 Search
- Use the search bar in header
- Try advanced search at `/search`

---

## Troubleshooting

### Error: "Service account object must contain..."

**Problem**: Environment variables not loaded

**Solution**:
```bash
# Check if .env.local exists
ls -la .env.local

# If not, create it
bash scripts/setup-env.sh
```

### Error: "Email already exists"

**Problem**: User already created

**Solution**: The script will ask if you want to update to admin. Say yes (y).

Or manually in Firebase Console:
1. Go to Authentication → Users
2. Find the user
3. Click menu → Edit user
4. Go to Custom claims tab
5. Set: `{"role":"admin","admin":true}`

### Error: "Permission denied" when creating post

**Problem**: User doesn't have admin role

**Solution**:
```bash
# Re-run the admin creation script
node scripts/create-admin-user.js

# Choose option to update existing user to admin
```

### Error: Cannot upload media

**Problem**: Storage rules or authentication issue

**Solution**:
```bash
# Redeploy storage rules
firebase deploy --only storage

# Check you're logged in
# Firebase Console → Authentication → check user exists
```

### Cloud Functions not triggering

**Problem**: Functions need time to propagate

**Solution**:
```bash
# Check function status
firebase functions:list

# View logs
firebase functions:log

# Redeploy specific function
firebase deploy --only functions:functionName
```

---

## What's Deployed and Running

✅ **Firestore Rules** - All collections protected
✅ **Storage Rules** - File upload/download rules active
✅ **13 Cloud Functions** - All deployed and running:

**Scheduled:**
- `publishScheduledPosts` - Every hour
- `cleanupTrashedPosts` - Every 24 hours

**Triggers:**
- `updateTaxonomyCounts` - On post changes
- `sendCommentNotification` - On new comment
- `sendUserWelcomeEmail` - On user creation
- `sendPostPublishedNotification` - On post publish
- `sendCommentApprovedNotification` - On comment approval

**HTTP (existing):**
- `feedbackSubmit`
- `feedbackUploadComplete`
- `adminFeedbackApprove`
- `adminFeedbackReject`
- `adminTourUploadUrl`
- `adminTourUploadDirect`

---

## Next Steps After Setup

1. **Configure Email** (Optional but recommended)
   ```bash
   # Install Firebase Extension for email
   firebase ext:install firebase/firestore-send-email

   # Or use SendGrid
   firebase functions:config:set sendgrid.key="YOUR_KEY"
   ```

2. **Add More Content**
   - Create 5-10 posts
   - Upload images
   - Create categories and tags
   - Test comments

3. **Customize Theme**
   - Set your brand colors
   - Choose fonts
   - Add logo

4. **Deploy to Production** (when ready)
   ```bash
   npm run build
   firebase deploy
   ```

---

## Useful Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only rules
firebase deploy --only firestore:rules,storage

# View function logs
firebase functions:log

# List all functions
firebase functions:list

# Create admin user
node scripts/create-admin-user.js

# Run with specific Node version (if needed)
nvm use 20
```

---

## Resources

- **Firebase Console**: https://console.firebase.google.com/project/tourfeedbackhub-474704
- **Local Admin**: http://localhost:9002/admin
- **Documentation**:
  - `CMS_FEATURES.md` - Feature reference
  - `CMS_DEPLOYMENT_GUIDE.md` - Full deployment guide
  - `DEPLOYMENT_STATUS.md` - Current deployment status

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. View function logs: `firebase functions:log`
3. Check Firebase Console for errors
4. Review documentation files

---

## 🎉 You're All Set!

Follow the steps above and you'll be creating content in minutes!

**Quick checklist:**
- [ ] Downloaded service account JSON
- [ ] Created .env.local file
- [ ] Created admin user
- [ ] Started dev server
- [ ] Logged into admin panel
- [ ] Created first post

**Happy content creating!** ✨
