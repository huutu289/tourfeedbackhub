'use client';

import {use, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft, Save, Eye, Image as ImageIcon, Loader2} from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Card} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Separator} from '@/components/ui/separator';
import {Switch} from '@/components/ui/switch';
import {Checkbox} from '@/components/ui/checkbox';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {RichTextEditor} from '@/components/admin/rich-text-editor';
import {MediaLibrary} from '@/components/admin/media-library';
import {VersionHistory} from '@/components/admin/version-history';
import type {Category, Tag, MediaItem, PostStatus} from '@/lib/types';
import {useFirestore, useUser} from '@/firebase/provider';
import {useToast} from '@/hooks/use-toast';
import {useMemoFirebase} from '@/firebase/firestore/use-memo-firebase';
import {useCollection, type WithId} from '@/firebase/firestore/use-collection';
import {requireAppCheckToken} from '@/lib/admin/app-check';

interface PageProps {
  params: Promise<{id: string}>;
}

function mapCategory(doc: WithId<any>): Category {
  const createdAtValue = doc.createdAt;
  const updatedAtValue = doc.updatedAt;
  const createdAt =
    createdAtValue instanceof Timestamp
      ? createdAtValue.toDate()
      : createdAtValue?.toDate
        ? createdAtValue.toDate()
        : new Date();
  const updatedAt =
    updatedAtValue instanceof Timestamp
      ? updatedAtValue.toDate()
      : updatedAtValue?.toDate
        ? updatedAtValue.toDate()
        : undefined;

  return {
    id: doc.id,
    name: doc.name ?? 'Untitled category',
    slug: doc.slug ?? doc.id,
    description: doc.description ?? '',
    parentId: doc.parentId ?? null,
    createdAt,
    updatedAt,
  };
}

function mapTag(doc: WithId<any>): Tag {
  const createdAtValue = doc.createdAt;
  const createdAt =
    createdAtValue instanceof Timestamp
      ? createdAtValue.toDate()
      : createdAtValue?.toDate
        ? createdAtValue.toDate()
        : new Date();

  return {
    id: doc.id,
    name: doc.name ?? 'Untitled tag',
    slug: doc.slug ?? doc.id,
    description: doc.description ?? '',
    createdAt,
  };
}

function toMediaItem(data: any): MediaItem | null {
  if (!data) return null;
  const uploadedAt =
    data.uploadedAt instanceof Timestamp
      ? data.uploadedAt.toDate()
      : data.uploadedAt
        ? new Date(data.uploadedAt)
        : new Date();

  return {
    id: data.id ?? data.storagePath ?? data.url ?? crypto.randomUUID(),
    fileName: data.fileName ?? 'media-file',
    title: data.title,
    altText: data.altText,
    caption: data.caption,
    description: data.description,
    mimeType: data.mimeType ?? 'application/octet-stream',
    fileSize: data.fileSize ?? 0,
    mediaType: data.mediaType ?? 'other',
    url: data.url,
    storagePath: data.storagePath ?? '',
    thumbnailUrl: data.thumbnailUrl,
    width: data.width,
    height: data.height,
    uploadedBy: data.uploadedBy ?? 'unknown',
    uploadedAt,
    metadata: data.metadata ?? {},
  };
}

/**
 * Remove undefined values from object for Firestore compatibility
 * Firestore doesn't accept undefined - use null or omit the field
 */
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
}

export default function PostEditorPage({params}: PageProps) {
  const router = useRouter();
  const {id} = use(params);
  const isNew = id === 'new';

  const firestore = useFirestore();
  const {user} = useUser();
  const {toast} = useToast();

  const [loadingPost, setLoadingPost] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [featuredImage, setFeaturedImage] = useState<MediaItem | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [locale, setLocale] = useState('en');
  const [scheduledFor, setScheduledFor] = useState<string>('');

  // SEO state
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');

  const categoriesRef = useMemoFirebase(() => collection(firestore, 'categories'), [firestore]);
  const tagsRef = useMemoFirebase(() => collection(firestore, 'tags'), [firestore]);

  const {data: categoryDocs} = useCollection(categoriesRef);
  const {data: tagDocs} = useCollection(tagsRef);

  const categories = useMemo(
    () => (categoryDocs ? categoryDocs.map(mapCategory).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [categoryDocs],
  );

  const tags = useMemo(
    () => (tagDocs ? tagDocs.map(mapTag).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [tagDocs],
  );

  useEffect(() => {
    if (isNew) {
      setLoadingPost(false);
      return;
    }

    const loadPost = async () => {
      try {
        setLoadingPost(true);
        const snap = await getDoc(doc(firestore, 'posts', id));
        if (!snap.exists()) {
          toast({
            title: 'Không tìm thấy bài viết',
            description: 'Bài viết đã bị xóa hoặc bạn không có quyền truy cập.',
            variant: 'destructive',
          });
          router.push('/admin/posts');
          return;
        }

        const data = snap.data();
        setTitle(data.title ?? '');
        setSlug(data.slug ?? '');
        setContent(data.content ?? '');
        setExcerpt(data.excerpt ?? '');
        setStatus((data.status as PostStatus) ?? 'draft');
        setAllowComments(data.allowComments !== false);
        setSelectedCategories(Array.isArray(data.categoryIds) ? data.categoryIds : []);
        setSelectedTags(Array.isArray(data.tagIds) ? data.tagIds : []);
        setMetaTitle(data?.seo?.metaTitle ?? '');
        setMetaDescription(data?.seo?.metaDescription ?? '');
        setFocusKeyword(data?.seo?.focusKeyword ?? '');
        setFeaturedImage(toMediaItem(data.featuredImage) ?? null);
        setLocale(data.locale ?? 'en');
        if (data.scheduledFor) {
          const scheduledDate = data.scheduledFor instanceof Timestamp
            ? data.scheduledFor.toDate()
            : new Date(data.scheduledFor);
          setScheduledFor(scheduledDate.toISOString().slice(0, 16));
        }
      } catch (error: any) {
        console.error('Failed to load post', error);
        toast({
          title: 'Không thể tải bài viết',
          description: error?.message ?? 'Vui lòng thử lại sau.',
          variant: 'destructive',
        });
      } finally {
        setLoadingPost(false);
      }
    };

    loadPost();
  }, [firestore, id, isNew, router, toast]);

  const generateSlug = () => {
    const generated = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setSlug(generated);
  };

  const handleAssignStatus = (value: string) => {
    setStatus(value as PostStatus);
  };

  const handleSave = async (targetStatus: PostStatus) => {
    if (!title.trim()) {
      toast({
        title: 'Thiếu tiêu đề',
        description: 'Vui lòng nhập tiêu đề cho bài viết.',
        variant: 'destructive',
      });
      return;
    }

    const finalSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

    if (!finalSlug) {
      toast({
        title: 'Slug không hợp lệ',
        description: 'Vui lòng nhập slug hợp lệ hoặc cập nhật tiêu đề.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await requireAppCheckToken();

      const now = serverTimestamp();
      const authorName = user?.displayName || user?.email || 'Unknown';

      // Clean featured image data - remove undefined fields for Firestore
      const featuredPayload = featuredImage
        ? removeUndefined({
            id: featuredImage.id,
            fileName: featuredImage.fileName,
            title: featuredImage.title,
            altText: featuredImage.altText,
            caption: featuredImage.caption,
            description: featuredImage.description,
            mimeType: featuredImage.mimeType,
            fileSize: featuredImage.fileSize,
            mediaType: featuredImage.mediaType,
            url: featuredImage.url,
            storagePath: featuredImage.storagePath,
            thumbnailUrl: featuredImage.thumbnailUrl,
            width: featuredImage.width,
            height: featuredImage.height,
            uploadedBy: featuredImage.uploadedBy,
            uploadedAt: featuredImage.uploadedAt.toISOString(),
            metadata: featuredImage.metadata ?? {},
          })
        : null;

      const baseData = {
        type: 'post' as const,
        title: title.trim(),
        slug: finalSlug,
        content,
        excerpt,
        status: targetStatus,
        categoryIds: selectedCategories,
        tagIds: selectedTags,
        allowComments,
        locale: locale,
        scheduledFor: scheduledFor && targetStatus === 'scheduled' ? new Date(scheduledFor) : null,
        seo: removeUndefined({
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          focusKeyword: focusKeyword || undefined,
        }),
        featuredImageId: featuredImage?.id ?? null,
        featuredImage: featuredPayload,
        authorId: user?.uid ?? 'unknown',
        authorName,
      };

      if (isNew) {
        await addDoc(collection(firestore, 'posts'), {
          ...baseData,
          createdAt: now,
          updatedAt: now,
          publishedAt: targetStatus === 'published' ? now : null,
        });
        toast({
          title: 'Đã tạo bài viết',
          description: targetStatus === 'published'
            ? 'Bài viết đã được xuất bản.'
            : 'Bản nháp của bạn đã được lưu.',
        });
      } else {
        const updatePayload: Record<string, any> = {
          ...baseData,
          updatedAt: now,
        };
        if (targetStatus === 'published') {
          updatePayload.publishedAt = now;
        }
        await updateDoc(doc(firestore, 'posts', id), updatePayload);
        toast({
          title: targetStatus === 'published' ? 'Đã xuất bản bài viết' : 'Đã lưu bài viết',
          description: targetStatus === 'published'
            ? 'Bài viết hiện đã hiển thị công khai.'
            : 'Bản nháp đã được cập nhật.',
        });
      }

      setStatus(targetStatus);
      router.push('/admin/posts');
    } catch (error: any) {
      console.error('Failed to save post', error);
      toast({
        title: 'Không thể lưu bài viết',
        description: error?.message ?? 'Đã xảy ra lỗi khi lưu. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Đang tải bài viết...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-3 sm:px-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/admin/posts">
            <Button variant="ghost" size="icon" className="sm:rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{isNew ? 'New Post' : 'Edit Post'}</h1>
            <p className="text-muted-foreground mt-1">
              Create and publish blog content
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            className="w-full sm:w-auto"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => handleSave('draft')}
            className="w-full sm:w-auto"
          >
            Save Draft
          </Button>
          <Button
            disabled={saving}
            onClick={() => handleSave('published')}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Enter post title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-3xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  placeholder="post-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full sm:flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSlug}
                  className="w-full sm:w-auto"
                >
                  Generate
                </Button>
              </div>

              <Separator />

              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your post content..."
              />
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-4">Excerpt</h3>
            <Textarea
              placeholder="Write a short excerpt for this post..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-2">
              This will be displayed in post previews and search results
            </p>
          </Card>

          {/* SEO Settings */}
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-4">SEO Settings</h3>
            <Tabs defaultValue="basic">
              <TabsList>
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="social">Social Media</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div>
                  <Label>Meta Title</Label>
                  <Input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={title || 'Post title'}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {metaTitle.length}/60 characters
                  </p>
                </div>

                <div>
                  <Label>Meta Description</Label>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Brief description of your post"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {metaDescription.length}/160 characters
                  </p>
                </div>

                <div>
                  <Label>Focus Keyword</Label>
                  <Input
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="Main keyword for this post"
                  />
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Customize how this post appears when shared on social media
                </p>
                <p className="text-sm text-muted-foreground">
                  Tính năng này sẽ được bổ sung sau.
                </p>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Advanced SEO options for indexing and canonicalization
                </p>
                <p className="text-sm text-muted-foreground">
                  Tính năng này sẽ được bổ sung sau.
                </p>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-4">Publish Settings</h3>
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={handleAssignStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {status === 'scheduled' && (
                <div>
                  <Label>Scheduled Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Post will be published at this date and time
                  </p>
                </div>
              )}

              <div>
                <Label>Language</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-sm sm:text-base">Allow Comments</Label>
                <Switch
                  checked={allowComments}
                  onCheckedChange={setAllowComments}
                  className="self-start"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-4">Featured Image</h3>
            {featuredImage ? (
              <div className="space-y-2">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden featured-image-frame">
                  <img
                    src={featuredImage.url}
                    alt={featuredImage.altText || ''}
                    className="featured-image-preview w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setShowMediaLibrary(true)}
                >
                  Change Image
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setFeaturedImage(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowMediaLibrary(true)}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Set Featured Image
              </Button>
            )}
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-4">Categories</h3>
            <div className="category-list space-y-2 max-h-48 overflow-y-auto">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCategories((prev) => [...prev, category.id]);
                        } else {
                          setSelectedCategories((prev) => prev.filter((id) => id !== category.id));
                        }
                      }}
                      className="h-5 w-5 sm:h-4 sm:w-4"
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No categories available</p>
              )}
            </div>
            <Button variant="link" size="sm" className="mt-2 p-0">
              + Add New Category
            </Button>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-4">Tags</h3>
            <div className="tag-list space-y-2 max-h-48 overflow-y-auto">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTags((prev) => [...prev, tag.id]);
                        } else {
                          setSelectedTags((prev) => prev.filter((id) => id !== tag.id));
                        }
                      }}
                      className="h-5 w-5 sm:h-4 sm:w-4"
                    />
                    <span className="text-sm">{tag.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags available</p>
              )}
            </div>
            <Button variant="link" size="sm" className="mt-2 p-0">
              + Add New Tag
            </Button>
          </Card>

          <VersionHistory postId={id} onRestore={() => router.refresh()} />
        </div>
      </div>

      <MediaLibrary
        open={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(media) => {
          setFeaturedImage(media);
          setShowMediaLibrary(false);
        }}
        filterType="image"
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Xem trước bài viết</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold">{title || 'Untitled Post'}</p>
              <p className="text-sm text-muted-foreground">Slug: {slug || '(sẽ tạo tự động)'}</p>
            </div>
            {featuredImage && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={featuredImage.url}
                  alt={featuredImage.altText || featuredImage.fileName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div
              className="prose prose-blue max-w-none"
              dangerouslySetInnerHTML={{
                __html: content || '<p><em>Nội dung bài viết sẽ hiển thị ở đây.</em></p>',
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
