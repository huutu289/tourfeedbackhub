import type {UserRole} from './types';

export const PERMISSIONS = {
  // Posts
  CREATE_POSTS: 'create_posts',
  EDIT_OWN_POSTS: 'edit_own_posts',
  EDIT_ALL_POSTS: 'edit_all_posts',
  DELETE_OWN_POSTS: 'delete_own_posts',
  DELETE_ALL_POSTS: 'delete_all_posts',
  PUBLISH_POSTS: 'publish_posts',

  // Pages
  CREATE_PAGES: 'create_pages',
  EDIT_PAGES: 'edit_pages',
  DELETE_PAGES: 'delete_pages',
  PUBLISH_PAGES: 'publish_pages',

  // Media
  UPLOAD_MEDIA: 'upload_media',
  DELETE_OWN_MEDIA: 'delete_own_media',
  DELETE_ALL_MEDIA: 'delete_all_media',

  // Comments
  MODERATE_COMMENTS: 'moderate_comments',
  DELETE_COMMENTS: 'delete_comments',

  // Categories & Tags
  MANAGE_CATEGORIES: 'manage_categories',
  MANAGE_TAGS: 'manage_tags',

  // Users
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',

  // Settings
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_THEME: 'manage_theme',
  MANAGE_NAVIGATION: 'manage_navigation',

  // Analytics
  VIEW_ANALYTICS: 'view_analytics',

  // Tours & Reviews (existing functionality)
  MANAGE_TOURS: 'manage_tours',
  MANAGE_REVIEWS: 'manage_reviews',
  MANAGE_STORIES: 'manage_stories',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Admin has all permissions
    ...Object.values(PERMISSIONS),
  ],
  editor: [
    // Posts
    PERMISSIONS.CREATE_POSTS,
    PERMISSIONS.EDIT_OWN_POSTS,
    PERMISSIONS.EDIT_ALL_POSTS,
    PERMISSIONS.DELETE_OWN_POSTS,
    PERMISSIONS.PUBLISH_POSTS,

    // Pages
    PERMISSIONS.CREATE_PAGES,
    PERMISSIONS.EDIT_PAGES,
    PERMISSIONS.PUBLISH_PAGES,

    // Media
    PERMISSIONS.UPLOAD_MEDIA,
    PERMISSIONS.DELETE_OWN_MEDIA,

    // Comments
    PERMISSIONS.MODERATE_COMMENTS,
    PERMISSIONS.DELETE_COMMENTS,

    // Categories & Tags
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_TAGS,

    // Analytics
    PERMISSIONS.VIEW_ANALYTICS,

    // Tours & Reviews
    PERMISSIONS.MANAGE_TOURS,
    PERMISSIONS.MANAGE_REVIEWS,
    PERMISSIONS.MANAGE_STORIES,
  ],
  author: [
    // Posts
    PERMISSIONS.CREATE_POSTS,
    PERMISSIONS.EDIT_OWN_POSTS,
    PERMISSIONS.DELETE_OWN_POSTS,
    PERMISSIONS.PUBLISH_POSTS,

    // Media
    PERMISSIONS.UPLOAD_MEDIA,
    PERMISSIONS.DELETE_OWN_MEDIA,

    // Categories & Tags (view/use only, not manage)
  ],
  contributor: [
    // Posts
    PERMISSIONS.CREATE_POSTS,
    PERMISSIONS.EDIT_OWN_POSTS,
    PERMISSIONS.DELETE_OWN_POSTS,
    // Note: Contributors cannot publish, only submit for review

    // Media
    PERMISSIONS.UPLOAD_MEDIA,
    PERMISSIONS.DELETE_OWN_MEDIA,
  ],
  subscriber: [
    // Subscribers have minimal permissions (view content, comment)
  ],
};

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function canEditPost(userRole: UserRole, postAuthorId: string, currentUserId: string): boolean {
  if (hasPermission(userRole, PERMISSIONS.EDIT_ALL_POSTS)) {
    return true;
  }

  if (hasPermission(userRole, PERMISSIONS.EDIT_OWN_POSTS) && postAuthorId === currentUserId) {
    return true;
  }

  return false;
}

export function canDeletePost(userRole: UserRole, postAuthorId: string, currentUserId: string): boolean {
  if (hasPermission(userRole, PERMISSIONS.DELETE_ALL_POSTS)) {
    return true;
  }

  if (hasPermission(userRole, PERMISSIONS.DELETE_OWN_POSTS) && postAuthorId === currentUserId) {
    return true;
  }

  return false;
}

export function canDeleteMedia(userRole: UserRole, mediaAuthorId: string, currentUserId: string): boolean {
  if (hasPermission(userRole, PERMISSIONS.DELETE_ALL_MEDIA)) {
    return true;
  }

  if (hasPermission(userRole, PERMISSIONS.DELETE_OWN_MEDIA) && mediaAuthorId === currentUserId) {
    return true;
  }

  return false;
}
