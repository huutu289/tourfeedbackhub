'use client';

import {useState, useMemo} from 'react';
import {Plus, Search, Edit, Trash2, MoreVertical, Upload, Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Card} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {Category} from '@/lib/types';

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');

  // Firebase hooks
  const firestore = useFirestore();
  const {toast} = useToast();
  const categoriesRef = useMemoFirebase(() => collection(firestore, 'categories'), [firestore]);
  const {data: categoriesData, isLoading} = useCollection(categoriesRef);

  // Map Firestore data to Category type
  const categories: Category[] = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.map((doc): Category => ({
      id: doc.id,
      name: doc.name ?? '',
      slug: doc.slug ?? '',
      description: doc.description,
      parentId: doc.parentId ?? null,
      order: doc.order ?? 0,
      count: doc.count ?? 0,
      createdAt: doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : new Date(),
      updatedAt: doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : new Date(),
    })).sort((a, b) => a.order - b.order);
  }, [categoriesData]);

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setParentId('');
    setEditingCategory(null);
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setSlug(category.slug);
      setDescription(category.description || '');
      setParentId(category.parentId || '');
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await requireAppCheckToken();

      const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-');
      const now = new Date();
      const categoryId = editingCategory?.id || doc(collection(firestore, 'categories')).id;

      const categoryData = {
        name: name.trim(),
        slug: categorySlug,
        description: description.trim() || null,
        parentId: parentId || null,
        order: editingCategory?.order ?? categories.length,
        count: editingCategory?.count ?? 0,
        createdAt: editingCategory?.createdAt ? Timestamp.fromDate(editingCategory.createdAt) : Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      await setDoc(doc(firestore, 'categories', categoryId), categoryData);

      toast({
        title: editingCategory ? 'Category Updated' : 'Category Created',
        description: `"${name}" has been ${editingCategory ? 'updated' : 'created'} successfully.`,
      });

      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      toast({
        title: 'Save Failed',
        description: error?.message ?? 'Failed to save category. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'categories', categoryId));

      toast({
        title: 'Category Deleted',
        description: 'Category has been deleted successfully.',
      });
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      toast({
        title: 'Delete Failed',
        description: error?.message ?? 'Failed to delete category. Please try again.',
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
      const parentMap = new Map<number, string>(); // indentation level -> category ID
      const now = Timestamp.fromDate(new Date());
      let orderCounter = categories.length;
      let importCount = 0;

      for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;

        // Count leading spaces/tabs to determine hierarchy
        const match = line.match(/^(\s*)(.*)/);
        if (!match) continue;

        const indent = match[1].length;
        const content = match[2].trim();

        if (!content) continue;

        // Parse line: "name | slug | description" or just "name"
        const parts = content.split('|').map(p => p.trim());
        const categoryName = parts[0];
        if (!categoryName) continue;

        const categorySlug = parts[1] || categoryName.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        const categoryDescription = parts[2] || null;

        // Determine parent based on indentation
        let parentId = null;
        if (indent > 0) {
          // Find parent with less indentation
          for (let i = indent - 1; i >= 0; i--) {
            if (parentMap.has(i)) {
              parentId = parentMap.get(i) || null;
              break;
            }
          }
        }

        // Generate unique ID
        const categoryId = doc(collection(firestore, 'categories')).id;

        const categoryData = {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          parentId,
          order: orderCounter++,
          count: 0,
          createdAt: now,
          updatedAt: now,
        };

        batch.set(doc(firestore, 'categories', categoryId), categoryData);
        parentMap.set(indent, categoryId);
        importCount++;
      }

      if (importCount === 0) {
        toast({
          title: 'No Categories Found',
          description: 'No valid categories found in the input.',
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }

      // Commit batch write
      await batch.commit();

      toast({
        title: 'Import Successful',
        description: `Successfully imported ${importCount} ${importCount === 1 ? 'category' : 'categories'}.`,
      });

      setShowImportDialog(false);
      setImportText('');
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error?.message ?? 'Failed to import categories. Please check the format and try again.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header - Mobile First */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Categories</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Organize your content with categories
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
            New Category
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-3 md:p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
        </div>
      </Card>

      {/* Categories List - Mobile Cards, Desktop Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCategories.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead className="hidden xl:table-cell">Parent</TableHead>
                    <TableHead className="hidden xl:table-cell">Count</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{category.slug}</code>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-md">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {category.description || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {category.parentId
                          ? categories.find(c => c.id === category.parentId)?.name || '—'
                          : '—'}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">{category.count || 0}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(category.id)}
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
              {filteredCategories.map((category) => (
                <div key={category.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base truncate">{category.name}</h3>
                      <code className="text-xs bg-muted px-2 py-1 rounded inline-block mt-1">
                        {category.slug}
                      </code>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {category.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {category.parentId && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Parent:</span>
                        <span>{categories.find(c => c.id === category.parentId)?.name || '—'}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Count:</span>
                      <span>{category.count || 0}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 px-4 text-muted-foreground">
            <p className="text-base">No categories found</p>
            <p className="text-sm mt-2">Create your first category to get started</p>
          </div>
        )}
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingCategory ? 'Edit Category' : 'New Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="category-slug"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate from name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent" className="text-sm font-medium">Parent Category</Label>
              <Select value={parentId || 'none'} onValueChange={(value) => setParentId(value === 'none' ? '' : value)}>
                <SelectTrigger id="parent" className="w-full">
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">Import Categories</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="import-text" className="text-sm font-medium">Category Data</Label>
              <Textarea
                id="import-text"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste category data here..."
                rows={10}
                className="font-mono text-xs sm:text-sm w-full resize-none"
              />
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-md">
                <p><strong>Format:</strong> One category per line</p>
                <p><strong>Hierarchy:</strong> Use indentation (spaces) for child categories</p>
                <p><strong>Syntax:</strong> <code className="bg-background px-1.5 py-0.5 rounded">name | slug | description</code></p>
                <p className="text-muted-foreground/70">(slug and description are optional)</p>
              </div>
            </div>

            <div className="border-l-2 border-primary/20 pl-3 sm:pl-4 space-y-2">
              <p className="text-sm font-medium">Example:</p>
              <pre className="text-xs bg-muted p-2 sm:p-3 rounded-md overflow-x-auto">
{`Travel
  Northern Vietnam | northern-vietnam | Explore the north
  Central Vietnam | central-vietnam
  Southern Vietnam
Food & Cuisine
  Vietnamese Food
  Street Food`}
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
              {importing ? 'Importing...' : 'Import Categories'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
