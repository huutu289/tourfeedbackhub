'use client';

import {useState, useCallback, useRef, useEffect, useMemo} from 'react';
import {Upload, Search, Grid3x3, List, Image as ImageIcon, File, Video, Music, FileText, Loader2, Trash2, MoreVertical} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay} from '@/components/ui/dialog';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {ScrollArea} from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {MediaItem, MediaType} from '@/lib/types';
import {format} from 'date-fns';
import {
  ref,
  listAll,
  getDownloadURL,
  getMetadata,
  uploadBytesResumable,
  deleteObject,
  type FirebaseStorage,
  type StorageReference,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import {useStorage, useUser} from '@/firebase/provider';
import {useToast} from '@/hooks/use-toast';
import {cn} from '@/lib/utils';

interface MediaLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (media: MediaItem) => void;
  onSelectMany?: (media: MediaItem[]) => void;
  allowMultiple?: boolean;
  filterType?: MediaType;
}

export function MediaLibrary({
  open,
  onClose,
  onSelect,
  onSelectMany,
  allowMultiple = false,
  filterType,
}: MediaLibraryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'document' | 'audio'>('all');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [altText, setAltText] = useState('');
  const [imageTitle, setImageTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storage = useStorage();
  const {user} = useUser();
  const {toast} = useToast();

  // Mock media items - replace with real data from Firestore
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  const inferMediaType = (mimeType: string | null | undefined): MediaType => {
    if (!mimeType) return 'other';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('msword') ||
      mimeType.includes('officedocument') ||
      mimeType.includes('text')
    ) {
      return 'document';
    }
    return 'other';
  };

  const collectAllItems = useCallback(async (storageInstance: FirebaseStorage, basePath: string) => {
    async function dfs(currentRef: StorageReference): Promise<StorageReference[]> {
      const result = await listAll(currentRef);
      const nested = await Promise.all(result.prefixes.map((prefix) => dfs(prefix)));
      return [...result.items, ...nested.flat()];
    }

    return dfs(ref(storageInstance, basePath));
  }, []);

  const toMediaItem = useCallback(
    async (itemRef: StorageReference): Promise<MediaItem> => {
      const [metadata, downloadUrl] = await Promise.all([getMetadata(itemRef), getDownloadURL(itemRef)]);

      const uploadedAt = metadata.timeCreated ? new Date(metadata.timeCreated) : new Date();
      const updatedAt = metadata.updated ? new Date(metadata.updated) : uploadedAt;
      const mediaType = inferMediaType(metadata.contentType);
      const custom = metadata.customMetadata ?? {};

      return {
        id: itemRef.fullPath,
        fileName: metadata.name ?? itemRef.name,
        title: custom.title ?? metadata.name ?? itemRef.name,
        altText: custom.altText,
        caption: custom.caption,
        description: custom.description,
        mimeType: metadata.contentType ?? 'application/octet-stream',
        fileSize: metadata.size ?? 0,
        mediaType,
        url: downloadUrl,
        storagePath: itemRef.fullPath,
        thumbnailUrl: custom.thumbnailUrl,
        width: custom.width ? Number(custom.width) : undefined,
        height: custom.height ? Number(custom.height) : undefined,
        uploadedBy: custom.uploadedBy ?? 'unknown',
        uploadedAt,
        metadata: {
          ...custom,
          updatedAt: updatedAt.toISOString(),
        },
      };
    },
    []
  );

  const loadMediaItems = useCallback(async () => {
    if (!storage) return;
    setLoading(true);
    try {
      const allRefs = await collectAllItems(storage, 'media');
      const items = await Promise.all(allRefs.map(toMediaItem));
      items.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      setMediaItems(items);
    } catch (error: any) {
      if (error?.code === 'storage/object-not-found') {
        setMediaItems([]);
        setLoading(false);
        return;
      }
      console.error('Failed to load media items:', error);
      toast({
        title: 'Không thể tải thư viện media',
        description: error?.message ?? 'Đã xảy ra lỗi khi đọc Firebase Storage.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [storage, collectAllItems, toMediaItem, toast]);

  useEffect(() => {
    if (open) {
      if (filterType && filterType !== 'other') {
        setActiveTab(filterType);
      }
      loadMediaItems();
    } else {
      setSelectedItems([]);
    }
  }, [open, filterType, loadMediaItems]);

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if any file is an image
    const hasImages = files.some((file) => file.type.startsWith('image/'));

    if (hasImages) {
      // Show metadata dialog for images
      setPendingFiles(files);
      setShowMetadataDialog(true);
      setAltText('');
      setImageTitle('');
    } else {
      // Upload non-images directly
      await uploadFiles(files);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const uploadFiles = useCallback(async (files: File[], metadata?: {altText?: string; title?: string}) => {
    if (!storage) return;

    setUploading(true);

    try {
      await Promise.all(
        files.map(async (file) => {
          const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
          const fileRef = ref(storage, `media/${uniqueName}`);
          const uploadTask = uploadBytesResumable(fileRef, file, {
            contentType: file.type,
            customMetadata: {
              uploadedBy: user?.uid ?? 'anonymous',
              uploadedByEmail: user?.email ?? '',
              originalName: file.name,
              ...(metadata?.altText && {altText: metadata.altText}),
              ...(metadata?.title && {title: metadata.title}),
            },
          });

          await new Promise<UploadTaskSnapshot>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              undefined,
              (error) => reject(error),
              () => resolve(uploadTask.snapshot)
            );
          });
        })
      );

      toast({
        title: 'Đã tải lên thành công',
        description: `${files.length} tập tin đã được thêm vào thư viện media.`,
      });

      await loadMediaItems();
    } catch (error: any) {
      console.error('Upload media failed:', error);
      toast({
        title: 'Tải lên thất bại',
        description: error?.message ?? 'Không thể tải lên tệp. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [storage, user?.uid, user?.email, loadMediaItems, toast]);

  const handleSelect = (item: MediaItem) => {
    if (allowMultiple) {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.id === item.id);
        if (exists) {
          return prev.filter(i => i.id !== item.id);
        }
        return [...prev, item];
      });
    } else {
      onSelect?.(item);
      onClose();
    }
  };

  const handleConfirmSelection = () => {
    if (selectedItems.length === 0) return;

    if (allowMultiple && onSelectMany) {
      onSelectMany(selectedItems);
    } else if (onSelect) {
      onSelect(selectedItems[0]);
    }
    onClose();
  };

  const handleDelete = async (item: MediaItem, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent item selection

    if (!confirm(`Xóa "${item.fileName}"?\n\nHành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      // Delete from Firebase Storage
      const fileRef = ref(storage, item.storagePath);
      await deleteObject(fileRef);

      // Remove from local state
      setMediaItems(prev => prev.filter(i => i.id !== item.id));

      // Remove from selection if selected
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));

      toast({
        title: 'Đã xóa file',
        description: `"${item.fileName}" đã được xóa khỏi thư viện.`,
      });
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      toast({
        title: 'Xóa thất bại',
        description: error?.message ?? 'Không thể xóa file. Vui lòng thử lại.',
        variant: 'destructive',
      });
    }
  };

  const availableItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const tabFilter = filterType ?? (activeTab === 'all' ? undefined : activeTab);
    return mediaItems.filter((item) => {
      const originalName = typeof item.metadata?.originalName === 'string'
        ? item.metadata.originalName.toLowerCase()
        : '';
      const matchesSearch =
        !normalizedQuery ||
        item.fileName.toLowerCase().includes(normalizedQuery) ||
        item.title?.toLowerCase().includes(normalizedQuery) ||
        (originalName && originalName.includes(normalizedQuery));
      const matchesType = !tabFilter || item.mediaType === tabFilter;
      return matchesSearch && matchesType;
    });
  }, [mediaItems, searchQuery, filterType, activeTab]);

  const renderItems = (items: MediaItem[]) => {
    if (loading) {
      return (
        <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Đang tải thư viện media...</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Chưa có tập tin nào phù hợp</p>
          <p className="text-sm mt-2">Hãy tải tệp lên để bắt đầu</p>
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isSelected = selectedItems.some((selected) => selected.id === item.id);
            return (
              <Card
                key={item.id}
                className={cn(
                  'cursor-pointer transition-colors border-muted relative group',
                  isSelected && 'border-primary ring-2 ring-primary'
                )}
                onClick={() => handleSelect(item)}
              >
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {item.mediaType === 'image' ? (
                    <img src={item.url} alt={item.altText || item.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {getMediaIcon(item.mediaType)}
                      <span className="text-xs">{item.fileName.split('.').pop()?.toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={item.title || item.fileName}>
                        {item.title || item.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(item.fileSize)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(item.uploadedAt, 'dd MMM yyyy')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => handleDelete(item, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((item) => {
          const isSelected = selectedItems.some((selected) => selected.id === item.id);
          return (
            <Card
              key={item.id}
              className={cn(
                'p-4 cursor-pointer hover:border-primary transition-colors group',
                isSelected && 'border-primary'
              )}
              onClick={() => handleSelect(item)}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center shrink-0 overflow-hidden">
                  {item.mediaType === 'image' ? (
                    <img src={item.url} alt={item.altText || item.fileName} className="w-full h-full object-cover rounded" />
                  ) : (
                    getMediaIcon(item.mediaType)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={item.title || item.fileName}>
                    {item.title || item.fileName}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span>•</span>
                    <span>{format(item.uploadedAt, 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <Badge variant="outline">{item.mediaType}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(item, e)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="flex-1 flex flex-col"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="document">Documents</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {renderItems(availableItems)}
          </ScrollArea>
        </Tabs>

        {allowMultiple && selectedItems.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedItems([])}>
                Clear Selection
              </Button>
              <Button onClick={handleConfirmSelection}>
                Insert Selected
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Metadata Dialog for Images - with higher z-index to appear above parent dialog */}
      <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
        <DialogPortal>
          <DialogOverlay className="z-[60]" />
          <DialogContent className="max-w-md z-[60]">
            <DialogHeader>
              <DialogTitle>Image Metadata (Required)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Alt Text <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Describe the image for accessibility"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required for accessibility. Describe what's in the image for screen readers.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Title (Optional)</label>
                <Input
                  placeholder="Image title"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMetadataDialog(false);
                    setPendingFiles([]);
                    setAltText('');
                    setImageTitle('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!altText.trim()) {
                      toast({
                        title: 'Alt text required',
                        description: 'Please provide alt text for accessibility',
                        variant: 'destructive',
                      });
                      return;
                    }
                    setShowMetadataDialog(false);
                    await uploadFiles(pendingFiles, {
                      altText: altText.trim(),
                      title: imageTitle.trim() || undefined,
                    });
                    setPendingFiles([]);
                    setAltText('');
                    setImageTitle('');
                  }}
                  disabled={!altText.trim()}
                >
                  Upload
                </Button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </Dialog>
  );
}
