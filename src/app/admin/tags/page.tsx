'use client';

import {useState, useMemo} from 'react';
import {Plus, Search, Edit, Trash2, MoreVertical, Tag as TagIcon, Upload, Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {useToast} from '@/hooks/use-toast';
import {useFirestore} from '@/firebase/provider';
import {collection, doc, setDoc, deleteDoc, writeBatch, Timestamp} from 'firebase/firestore';
import {useCollection} from '@/firebase/firestore/use-collection';
import {useMemoFirebase} from '@/firebase/firestore/use-memo-firebase';
import {requireAppCheckToken} from '@/lib/admin/app-check';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import type {Tag} from '@/lib/types';

export default function TagsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // Firebase hooks
  const firestore = useFirestore();
  const {toast} = useToast();
  const tagsRef = useMemoFirebase(() => collection(firestore, 'tags'), [firestore]);
  const {data: tagsData, isLoading} = useCollection(tagsRef);

  // Map Firestore data to Tag type
  const tags: Tag[] = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.map((doc): Tag => ({
      id: doc.id,
      name: doc.name ?? '',
      slug: doc.slug ?? '',
      description: doc.description,
      count: doc.count ?? 0,
      createdAt: doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : new Date(),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tagsData]);

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setEditingTag(null);
  };

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setName(tag.name);
      setSlug(tag.slug);
      setDescription(tag.description || '');
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Tag name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await requireAppCheckToken();

      const tagSlug = slug || name.toLowerCase().replace(/\s+/g, '-');
      const now = new Date();
      const tagId = editingTag?.id || doc(collection(firestore, 'tags')).id;

      const tagData = {
        name: name.trim(),
        slug: tagSlug,
        description: description.trim() || null,
        count: editingTag?.count ?? 0,
        createdAt: editingTag?.createdAt ? Timestamp.fromDate(editingTag.createdAt) : Timestamp.fromDate(now),
      };

      await setDoc(doc(firestore, 'tags', tagId), tagData);

      toast({
        title: editingTag ? 'Tag Updated' : 'Tag Created',
        description: `"${name}" has been ${editingTag ? 'updated' : 'created'} successfully.`,
      });

      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to save tag:', error);
      toast({
        title: 'Save Failed',
        description: error?.message ?? 'Failed to save tag. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) {
      return;
    }

    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'tags', tagId));

      toast({
        title: 'Tag Deleted',
        description: 'Tag has been deleted successfully.',
      });
    } catch (error: any) {
      console.error('Failed to delete tag:', error);
      toast({
        title: 'Delete Failed',
        description: error?.message ?? 'Failed to delete tag. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;

    setImporting(true);
    try {
      await requireAppCheckToken();

      const lines = importText.split('\n');
      const batch = writeBatch(firestore);
      const now = Timestamp.fromDate(new Date());
      let importCount = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Parse line: "name | slug | description" or just "name"
        const parts = trimmed.split('|').map(p => p.trim());
        const tagName = parts[0];
        if (!tagName) continue;

        const tagSlug = parts[1] || tagName.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        const tagDescription = parts[2] || null;

        // Generate unique ID
        const tagId = doc(collection(firestore, 'tags')).id;

        const tagData = {
          name: tagName,
          slug: tagSlug,
          description: tagDescription,
          count: 0,
          createdAt: now,
        };

        batch.set(doc(firestore, 'tags', tagId), tagData);
        importCount++;
      }

      if (importCount === 0) {
        toast({
          title: 'No Tags Found',
          description: 'No valid tags found in the input.',
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }

      // Commit batch write
      await batch.commit();

      toast({
        title: 'Import Successful',
        description: `Successfully imported ${importCount} ${importCount === 1 ? 'tag' : 'tags'}.`,
      });

      setShowImportDialog(false);
      setImportText('');
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error?.message ?? 'Failed to import tags. Please check the format and try again.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header - Mobile First */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tags</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Add tags to help users find related content
          </p>
        </div>

        {/* Action Buttons - Stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Tag
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-3 md:p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
        </div>
      </Card>

      {/* Tags List - Mobile Cards, Desktop Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTags.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead className="hidden xl:table-cell">Usage Count</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TagIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{tag.slug}</code>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-md">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {tag.description || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <Badge variant="secondary">{tag.count || 0} posts</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(tag)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(tag.id)}
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

            {/* Mobile Card View */}
            <div className="md:hidden divide-y">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <TagIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <h3 className="font-medium text-base truncate">{tag.name}</h3>
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded inline-block mt-1">
                        {tag.slug}
                      </code>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(tag)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(tag.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {tag.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {tag.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {tag.count || 0} posts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 px-4 text-muted-foreground">
            <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-base">No tags found</p>
            <p className="text-sm mt-2">Create your first tag to get started</p>
          </div>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingTag ? 'Edit Tag' : 'New Tag'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tag name"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="tag-slug"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate from name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="w-full resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="w-full sm:w-auto"
            >
              Save Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">Import Tags</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="import-text" className="text-sm font-medium">Tag Data</Label>
              <Textarea
                id="import-text"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste tag data here..."
                rows={10}
                className="font-mono text-xs sm:text-sm w-full resize-none"
              />
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-md">
                <p><strong>Format:</strong> One tag per line</p>
                <p><strong>Syntax:</strong> <code className="bg-background px-1.5 py-0.5 rounded">name | slug | description</code></p>
                <p className="text-muted-foreground/70">(slug and description are optional)</p>
              </div>
            </div>

            <div className="border-l-2 border-primary/20 pl-3 sm:pl-4 space-y-2">
              <p className="text-sm font-medium">Example:</p>
              <pre className="text-xs bg-muted p-2 sm:p-3 rounded-md overflow-x-auto">
{`Travel Tips
Photography | photography | Tips for travel photography
Adventure | adventure-travel | Outdoor and adventure activities
Budget Travel | budget | Money-saving travel tips
Food & Cuisine | food-cuisine
Culture
Accommodation`}
              </pre>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportText('');
              }}
              disabled={importing}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !importText.trim()}
              className="w-full sm:w-auto"
            >
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {importing ? 'Importing...' : 'Import Tags'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
