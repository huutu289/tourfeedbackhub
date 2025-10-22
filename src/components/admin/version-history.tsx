'use client';

import {useState, useEffect, useMemo} from 'react';
import {collection, query, orderBy, getDocs, Timestamp} from 'firebase/firestore';
import {useFirestore} from '@/firebase/provider';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Loader2, History, RotateCcw} from 'lucide-react';
import {format} from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {useToast} from '@/hooks/use-toast';

interface PostVersion {
  id: string;
  postId: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  createdAt: Date;
  changeNote?: string;
  status?: string;
}

interface VersionHistoryProps {
  postId: string;
  onRestore?: () => void;
}

export function VersionHistory({postId, onRestore}: VersionHistoryProps) {
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<PostVersion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const firestore = useFirestore();
  const {toast} = useToast();

  useEffect(() => {
    const loadVersions = async () => {
      try {
        setLoading(true);
        const versionsRef = collection(firestore, 'posts', postId, 'versions');
        const q = query(versionsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const versionList: PostVersion[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            postId,
            title: data.title || 'Untitled',
            content: data.content || '',
            excerpt: data.excerpt || '',
            authorId: data.authorId || 'unknown',
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt || Date.now()),
            changeNote: data.changeNote,
            status: data.status,
          };
        });

        setVersions(versionList);
      } catch (error: any) {
        console.error('Error loading versions:', error);

        // Check if it's a permissions error
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          console.warn('Version history requires admin permissions. User may not be admin yet.');
          // Don't show error toast for permission issues - just show empty state
          setVersions([]);
        } else {
          toast({
            title: 'Error loading versions',
            description: 'Failed to load version history',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (postId && postId !== 'new') {
      loadVersions();
    } else {
      setLoading(false);
    }
  }, [postId, firestore, toast]);

  const handlePreview = (version: PostVersion) => {
    setPreviewVersion(version);
    setPreviewOpen(true);
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version? Current changes will be saved as a new version.')) {
      return;
    }

    setRestoring(true);
    try {
      // Call Cloud Function to restore version
      const response = await fetch('/api/posts/restore-version', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({postId, versionId}),
      });

      if (!response.ok) {
        throw new Error('Failed to restore version');
      }

      toast({
        title: 'Version restored',
        description: 'Post has been restored to the selected version',
      });

      if (onRestore) {
        onRestore();
      }

      // Refresh versions list
      setPreviewOpen(false);
      window.location.reload();
    } catch (error: any) {
      console.error('Error restoring version:', error);
      toast({
        title: 'Restore failed',
        description: error.message || 'Failed to restore version',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  if (postId === 'new') {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <History className="h-4 w-4" />
          <p className="text-sm">Version history will be available after first save</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm">Loading version history...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4" />
          <h3 className="font-semibold">Version History</h3>
          <Badge variant="secondary" className="ml-auto">
            {versions.length}
          </Badge>
        </div>

        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No version history yet</p>
        ) : (
          <div className="space-y-2">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{version.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(version.createdAt, 'MMM d, yyyy h:mm a')}
                  </p>
                  {version.changeNote && (
                    <p className="text-xs text-muted-foreground italic">{version.changeNote}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button size="sm" variant="ghost" onClick={() => handlePreview(version)}>
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version Preview</DialogTitle>
            <DialogDescription>
              {previewVersion && format(previewVersion.createdAt, 'MMMM d, yyyy h:mm a')}
            </DialogDescription>
          </DialogHeader>

          {previewVersion && (
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold">{previewVersion.title}</h3>
                {previewVersion.excerpt && (
                  <p className="text-muted-foreground mt-2">{previewVersion.excerpt}</p>
                )}
              </div>

              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{__html: previewVersion.content}}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            {previewVersion && (
              <Button
                onClick={() => handleRestore(previewVersion.id)}
                disabled={restoring}
              >
                {restoring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore This Version
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
