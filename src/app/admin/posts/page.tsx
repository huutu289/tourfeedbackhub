'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {Plus, Search, Filter, Trash2, Eye, Edit, MoreVertical, Loader2, ExternalLink} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ConfirmDialog} from '@/components/ui/confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Badge} from '@/components/ui/badge';
import {Card} from '@/components/ui/card';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import type {Post, PostStatus} from '@/lib/types';
import {format} from 'date-fns';
import {collection, doc, deleteDoc, Timestamp} from 'firebase/firestore';
import {useFirestore, useAuth} from '@/firebase/provider';
import {useToast} from '@/hooks/use-toast';
import {useMemoFirebase} from '@/firebase/firestore/use-memo-firebase';
import {useCollection, type WithId} from '@/firebase/firestore/use-collection';
import {requireAppCheckToken} from '@/lib/admin/app-check';

export default function PostsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; postId: string | null; postTitle: string}>({
    open: false,
    postId: null,
    postTitle: '',
  });
  const [generatingPreview, setGeneratingPreview] = useState<string | null>(null);
  const firestore = useFirestore();
  const auth = useAuth();
  const {toast} = useToast();

  const postsRef = useMemoFirebase(() => collection(firestore, 'posts'), [firestore]);
  const categoriesRef = useMemoFirebase(() => collection(firestore, 'categories'), [firestore]);
  const {data, isLoading} = useCollection(postsRef);
  const {data: categoriesData} = useCollection(categoriesRef);

  // Map categories
  const categoriesMap = useMemo(() => {
    if (!categoriesData) return new Map();
    return new Map(categoriesData.map(doc => [doc.id, {
      id: doc.id,
      name: doc.name ?? '',
      slug: doc.slug ?? '',
    }]));
  }, [categoriesData]);

  const posts: Post[] = useMemo(() => {
    if (!data) return [];
    return data.map((doc) => {
      const post = mapPost(doc);
      // Resolve categories from IDs
      if (post.categoryIds && post.categoryIds.length > 0) {
        post.categories = post.categoryIds
          .map(id => categoriesMap.get(id))
          .filter((cat): cat is {id: string; name: string; slug: string} => cat !== undefined);
      }
      return post;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [data, categoriesMap]);

  const getStatusBadge = (status: PostStatus) => {
    const variants: Record<PostStatus, {variant: any; label: string}> = {
      draft: {variant: 'secondary', label: 'Draft'},
      published: {variant: 'default', label: 'Published'},
      scheduled: {variant: 'outline', label: 'Scheduled'},
      private: {variant: 'secondary', label: 'Private'},
      trash: {variant: 'destructive', label: 'Trash'},
    };

    const config = variants[status] ?? variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteClick = (postId: string, postTitle: string) => {
    setDeleteDialog({open: true, postId, postTitle});
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.postId) return;

    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'posts', deleteDialog.postId));
      toast({title: 'Đã xóa bài viết', description: 'Bài viết đã được xóa thành công.'});
      setDeleteDialog({open: false, postId: null, postTitle: ''});
    } catch (error: any) {
      console.error('Failed to delete post', error);
      toast({
        title: 'Không thể xóa bài viết',
        description: error?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async (postId: string, slug: string, status: PostStatus) => {
    // Published posts can be viewed directly
    if (status === 'published') {
      window.open(`/blog/${slug}`, '_blank');
      return;
    }

    // Draft/scheduled posts need a preview token
    setGeneratingPreview(postId);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const idToken = await user.getIdToken();
      const response = await fetch('/api/preview/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({postId}),
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const {previewUrl} = await response.json();
      window.open(previewUrl, '_blank');
    } catch (error: any) {
      console.error('Preview generation error:', error);
      toast({
        title: 'Preview failed',
        description: error.message || 'Could not generate preview link',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPreview(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Create and manage your blog posts and articles
          </p>
        </div>
        <Link href="/admin/posts/new">
          <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
            <Plus className="h-5 w-5 mr-2" />
            Create New Post
          </Button>
        </Link>
      </div>

      <Card className="p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as PostStatus | 'all')}>
          <TabsList className="flex w-full flex-wrap justify-start gap-2 sm:gap-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="trash">Trash</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải danh sách bài viết...
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[880px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div>
                          <Link
                            href={`/admin/posts/${post.id}`}
                            className="font-medium hover:underline"
                          >
                            {post.title}
                          </Link>
                          {post.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{post.authorName || 'Unknown'}</TableCell>
                      <TableCell>
                        {post.categories?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {post.categories.slice(0, 2).map((cat) => (
                              <Badge key={cat.id} variant="outline" className="text-xs">
                                {cat.name}
                              </Badge>
                            ))}
                            {post.categories.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{post.categories.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(post.status)}</TableCell>
                      <TableCell>
                        {post.publishedAt
                          ? format(post.publishedAt, 'MMM d, yyyy')
                          : format(post.createdAt, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{post.viewCount || 0}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/posts/${post.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handlePreview(post.id, post.slug, post.status)}
                              disabled={generatingPreview === post.id}
                            >
                              {generatingPreview === post.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {post.status === 'published' ? 'View' : 'Preview'}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(post.id, post.title)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground max-w-md">
                Get started by creating your first blog post to share your stories and insights
                with your audience.
              </p>
              <Link href="/admin/posts/new" className="mt-4">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({open, postId: null, postTitle: ''})}
        onConfirm={handleDeleteConfirm}
        title="Delete Post"
        description={`Are you sure you want to delete "${deleteDialog.postTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

function mapPost(doc: WithId<any>): Post {
  const createdAtValue = doc.createdAt;
  const updatedAtValue = doc.updatedAt;
  const publishedAtValue = doc.publishedAt;

  const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const createdAt = toDate(createdAtValue) ?? new Date();
  const updatedAt = toDate(updatedAtValue) ?? createdAt;
  const publishedAt = toDate(publishedAtValue);

  return {
    id: doc.id,
    type: doc.type ?? 'post',
    title: doc.title ?? 'Untitled post',
    slug: doc.slug ?? doc.id,
    content: doc.content ?? '',
    excerpt: doc.excerpt ?? '',
    status: doc.status ?? 'draft',
    featuredImageId: doc.featuredImageId ?? undefined,
    featuredImage: doc.featuredImage ?? undefined,
    authorId: doc.authorId ?? 'unknown',
    authorName: doc.authorName ?? 'Unknown',
    categoryIds: Array.isArray(doc.categoryIds) ? doc.categoryIds : [],
    tagIds: Array.isArray(doc.tagIds) ? doc.tagIds : [],
    publishedAt: publishedAt ?? undefined,
    createdAt,
    updatedAt,
    viewCount: doc.viewCount ?? 0,
    commentCount: doc.commentCount ?? 0,
    allowComments: doc.allowComments !== false,
    seo: doc.seo ?? undefined,
  } as Post;
}
