# WordPress-Like CMS Features

This document outlines all the WordPress-like CMS features that have been added to Tour Insights Hub.

## Table of Contents

1. [Content Management](#content-management)
2. [Media Library](#media-library)
3. [User Management](#user-management)
4. [Taxonomy System](#taxonomy-system)
5. [Comments System](#comments-system)
6. [SEO Features](#seo-features)
7. [Theme Customization](#theme-customization)
8. [Analytics](#analytics)
9. [Search Functionality](#search-functionality)
10. [Security & Permissions](#security--permissions)

---

## Content Management

### Posts & Pages Editor
**Location:** `/admin/posts` and `/admin/posts/[id]`

#### Features:
- **Rich Text Editor** powered by TipTap
  - Bold, italic, underline, strikethrough
  - Headings (H1-H3)
  - Lists (ordered & unordered)
  - Blockquotes
  - Text alignment
  - Links and images
  - Undo/redo
- **Post Status Management**
  - Draft
  - Published
  - Scheduled
  - Private
  - Trash
- **Featured Images** via media library
- **Excerpt** for previews
- **SEO Settings** per post
  - Meta title & description
  - Focus keyword
  - Social media previews
  - Canonical URLs
- **Categories & Tags** assignment
- **Post Revisions** tracking
- **Autosave** functionality (to be implemented)
- **Slug Management** with auto-generation
- **Comment Controls** (allow/disallow)

#### Types:
```typescript
type PostType = 'post' | 'page';
type PostStatus = 'draft' | 'published' | 'scheduled' | 'private' | 'trash';
```

#### Firestore Collection: `posts`

---

## Media Library

**Location:** `/admin/media` (component: `src/components/admin/media-library.tsx`)

### Features:
- **Multiple Upload** support
- **File Type Support**
  - Images (JPG, PNG, GIF, WebP)
  - Videos (MP4, WebM)
  - Documents (PDF, DOC, DOCX)
  - Audio (MP3, WAV)
- **View Modes**
  - Grid view
  - List view
- **Search & Filter** by type
- **Metadata Management**
  - Title
  - Alt text
  - Caption
  - Description
- **Image Optimization** (to be integrated with Firebase Storage)
- **Thumbnail Generation**
- **Usage Tracking** (where media is used)

#### Types:
```typescript
type MediaType = 'image' | 'video' | 'document' | 'audio' | 'other';

interface MediaItem {
  id: string;
  fileName: string;
  title?: string;
  altText?: string;
  caption?: string;
  mimeType: string;
  fileSize: number;
  mediaType: MediaType;
  url: string;
  storagePath: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  uploadedBy: string;
  uploadedAt: Date;
}
```

#### Firestore Collection: `media`

---

## User Management

**Location:** `/admin/users`

### User Roles:
1. **Administrator** - Full access to all features
2. **Editor** - Can publish and manage posts including others' posts
3. **Author** - Can publish and manage their own posts
4. **Contributor** - Can write and manage own posts but cannot publish
5. **Subscriber** - Can only manage their profile

### Permissions System
**File:** `src/lib/permissions.ts`

#### Key Permissions:
- `create_posts`, `edit_own_posts`, `edit_all_posts`
- `delete_own_posts`, `delete_all_posts`, `publish_posts`
- `upload_media`, `delete_own_media`, `delete_all_media`
- `moderate_comments`, `delete_comments`
- `manage_categories`, `manage_tags`
- `manage_settings`, `manage_theme`, `manage_navigation`
- `view_analytics`, `manage_tours`, `manage_reviews`

### Features:
- **User CRUD operations**
- **Role assignment**
- **Status management** (active, inactive, banned)
- **Profile information**
  - Display name
  - Email
  - Avatar
  - Bio
  - Website
  - Social links
- **Last login tracking**

#### Types:
```typescript
type UserRole = 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  status: 'active' | 'inactive' | 'banned';
  createdAt: Date;
  lastLoginAt?: Date;
  permissions?: string[];
}
```

#### Firestore Collection: `users`

---

## Taxonomy System

### Categories
**Location:** `/admin/categories`

#### Features:
- **Hierarchical structure** (parent-child relationships)
- **Name & slug** management
- **Description** field
- **Post count** tracking
- **Auto-slug generation**

#### Firestore Collection: `categories`

### Tags
**Location:** `/admin/tags`

#### Features:
- **Flat taxonomy** (no hierarchy)
- **Name & slug** management
- **Description** field
- **Usage count** tracking
- **Bulk management**

#### Firestore Collection: `tags`

---

## Comments System

**Location:** `/admin/comments` (admin) and component in posts

### Features:
- **Threaded Comments** (nested replies)
- **Comment Moderation**
  - Pending review
  - Approved
  - Spam
  - Trash
- **Author Information**
  - Name
  - Email
  - Website (optional)
- **Per-post Controls** (enable/disable comments)
- **Admin Moderation Panel**
- **Bulk Actions**
- **Like/Report** functionality

#### Types:
```typescript
interface Comment {
  id: string;
  postId: string;
  postType: 'post' | 'page';
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'pending' | 'approved' | 'spam' | 'trash';
  parentId?: string | null;
  replies?: Comment[];
  createdAt: Date;
}
```

#### Firestore Collection: `comments`

---

## SEO Features

### Sitemap Generation
**File:** `src/app/sitemap.ts`

- **Dynamic XML Sitemap**
- Includes:
  - Static pages
  - Blog posts
  - Custom pages
  - Tours
  - Stories
- **Change Frequency** & **Priority** settings
- Auto-updates on content changes

### Robots.txt
**File:** `src/app/robots.ts`

- Crawler directives
- Disallow rules for admin/private areas
- Sitemap reference

### Per-Post SEO
Each post/page includes:
- **Meta Title** (60 chars recommended)
- **Meta Description** (160 chars recommended)
- **Focus Keyword**
- **Canonical URL**
- **Open Graph Tags** (for social sharing)
  - OG Title
  - OG Description
  - OG Image
- **Twitter Card** settings
- **Index/Noindex** controls
- **Follow/Nofollow** controls

#### Types:
```typescript
interface SEOMetadata {
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  noindex?: boolean;
  nofollow?: boolean;
}
```

---

## Theme Customization

**Location:** `/admin/appearance`

### Features:
- **Color Scheme**
  - Primary color
  - Secondary color
  - Accent color
  - Background color
  - Text color
  - Link color
- **Typography**
  - Primary font (body text)
  - Secondary font (headings)
  - Font size controls
- **Layout Options**
  - Header style (minimal, classic, modern)
  - Footer style (simple, detailed)
- **Custom Code**
  - Custom CSS
  - Custom JavaScript
- **Live Preview**
- **Reset to Defaults**

#### Types:
```typescript
interface ThemeSettings {
  primaryFont: string;
  secondaryFont: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  headerStyle: 'minimal' | 'classic' | 'modern';
  footerStyle: 'simple' | 'detailed';
  customCSS?: string;
  customJS?: string;
}
```

#### Firestore Collection: `themeSettings`

---

## Analytics

**Location:** `/admin/analytics`

### Metrics Tracked:
- **Page Views** (total & unique)
- **Unique Visitors**
- **Top Content**
  - Top posts
  - Top pages
- **Traffic Sources**
  - Referrers
  - Direct traffic
  - Social media
- **Device Breakdown**
  - Mobile
  - Desktop
  - Tablet
- **Engagement Metrics**
  - Bounce rate
  - Session duration
  - Pages per session

### Features:
- **Date Range Selection**
  - Today
  - Last 7/30/90 days
  - This year
  - Custom range
- **Data Export** (CSV/JSON)
- **Visual Charts** (to be integrated with Chart.js or Recharts)
- **Real-time Updates** (optional with Firebase)

#### Types:
```typescript
interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  topPosts: Array<{postId: string; title: string; views: number}>;
  topPages: Array<{url: string; views: number}>;
  referrers: Array<{source: string; count: number}>;
  devices: {mobile: number; desktop: number; tablet: number};
  period: {start: Date; end: Date};
}
```

---

## Search Functionality

### Global Search
**Location:** Header component with `SearchBar` component

#### Features:
- **Real-time Search** with debouncing
- **Multi-content Search**
  - Posts
  - Pages
  - Media
  - Categories
  - Tags
- **Search Suggestions** dropdown
- **Keyboard Navigation**
- **Match Scoring**

### Advanced Search Page
**Location:** `/search`

#### Features:
- **Filtering Options**
  - Content type
  - Categories
  - Tags
  - Date range
- **Sorting**
  - Relevance
  - Date (newest/oldest)
  - Title (A-Z)
- **Results Highlighting**
- **Pagination** (to be implemented)

### Implementation Notes:
- Currently using client-side filtering
- **Recommended:** Integrate with Algolia or Typesense for production
- Or use Firestore full-text search with Cloud Functions

---

## Security & Permissions

### Firestore Security Rules
**File:** `firestore.rules`

#### Key Rules:

**Posts:**
- Public can read published posts
- Authenticated users can create posts
- Authors can edit/delete their own posts
- Admins can edit/delete any post

**Comments:**
- Anyone can create comments (pending moderation)
- Public can read approved comments
- Only admins can moderate

**Media:**
- Public read access
- Authenticated users can upload
- Users can delete their own uploads
- Admins can delete any media

**Categories/Tags:**
- Public read
- Admin-only write

**Users:**
- Authenticated users can read user list
- Users can update their own profile
- Admins can manage all users

### Firebase App Check
- Configure App Check in Firebase Console
- Protects against:
  - Spam
  - Abuse
  - Unauthorized access
  - Quota theft

---

## Implementation Checklist

### ✅ Completed:
- [x] Post/Page editor with rich text
- [x] Media library with upload
- [x] Categories & tags management
- [x] User roles & permissions system
- [x] Comments system with moderation
- [x] SEO features (sitemap, robots.txt, metadata)
- [x] Theme customization
- [x] Analytics dashboard
- [x] Search functionality
- [x] Firestore security rules

### 🚧 To Integrate:
- [ ] Connect forms to actual Firestore operations
- [ ] Implement Firebase Storage for media uploads
- [ ] Add image optimization/resizing
- [ ] Integrate autosave for post editor
- [ ] Add post revision comparison UI
- [ ] Implement real search (Algolia/Typesense)
- [ ] Add widget system implementation
- [ ] Integrate analytics tracking (Google Analytics or custom)
- [ ] Add email notifications
- [ ] Implement scheduled publishing
- [ ] Add import/export functionality
- [ ] Create backup/restore system

### 🎯 Enhancements:
- [ ] Block-based editor (Gutenberg-style)
- [ ] Multi-language support (i18n)
- [ ] Advanced caching strategy
- [ ] CDN integration
- [ ] Image lazy loading
- [ ] Progressive Web App (PWA)
- [ ] Custom post types
- [ ] Custom fields
- [ ] Workflow/approval system
- [ ] Email campaigns
- [ ] Form builder
- [ ] Membership/subscriptions

---

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── posts/
│   │   │   ├── page.tsx              # Posts list
│   │   │   └── [id]/page.tsx         # Post editor
│   │   ├── categories/page.tsx        # Categories manager
│   │   ├── tags/page.tsx              # Tags manager
│   │   ├── users/page.tsx             # User management
│   │   ├── comments/page.tsx          # Comment moderation
│   │   ├── appearance/page.tsx        # Theme customization
│   │   └── analytics/page.tsx         # Analytics dashboard
│   ├── search/page.tsx                # Search results page
│   ├── sitemap.ts                     # Sitemap generator
│   └── robots.ts                      # Robots.txt
├── components/
│   ├── admin/
│   │   ├── media-library.tsx          # Media manager
│   │   └── rich-text-editor.tsx       # TipTap editor
│   ├── search-bar.tsx                 # Global search
│   └── comments-section.tsx           # Comments UI
├── lib/
│   ├── types.ts                       # TypeScript interfaces
│   └── permissions.ts                 # Role/permission logic
└── firestore.rules                    # Security rules
```

---

## Usage Examples

### Creating a Post
```typescript
const newPost: Partial<Post> = {
  type: 'post',
  title: 'My First Post',
  slug: 'my-first-post',
  content: '<p>Hello World!</p>',
  excerpt: 'This is my first blog post',
  status: 'published',
  authorId: currentUser.uid,
  categoryIds: ['cat-1', 'cat-2'],
  tagIds: ['tag-1'],
  allowComments: true,
  seo: {
    metaTitle: 'My First Post - Site Name',
    metaDescription: 'Read my first blog post about...',
    focusKeyword: 'first post',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

await addDoc(collection(firestore, 'posts'), newPost);
```

### Checking Permissions
```typescript
import {hasPermission, PERMISSIONS} from '@/lib/permissions';

if (hasPermission(user.role, PERMISSIONS.EDIT_ALL_POSTS)) {
  // Allow editing
}

if (canEditPost(user.role, post.authorId, user.uid)) {
  // Allow editing own post
}
```

---

## Dependencies Added

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-image": "^2.x",
  "@tiptap/extension-link": "^2.x",
  "@tiptap/extension-placeholder": "^2.x",
  "@tiptap/extension-text-align": "^2.x",
  "@tiptap/extension-underline": "^2.x"
}
```

---

## Support & Documentation

For detailed WordPress comparison and migration guide, see WordPress official documentation.

For Next.js specific implementations, refer to Next.js documentation.

For Firebase/Firestore, see Firebase documentation.
