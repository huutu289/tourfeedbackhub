'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase/provider';
import { collection, deleteDoc, doc, setDoc, writeBatch } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { requireAppCheckToken } from '@/lib/admin/app-check';
import { useSearchPagination } from '@/hooks/use-search-pagination';
import { Loader2, Download, Upload, FileText, Pencil, Trash2, Trash } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/admin/pagination-controls';

const languageSchema = z.object({
  name: z.string().min(1, 'Language name is required'),
  code: z.string().max(10, 'Keep the code short').optional(),
});

type LanguageFormValues = z.infer<typeof languageSchema>;

interface Language {
  id: string;
  name: string;
  code?: string;
}

function mapLanguage(doc: WithId<any>): Language {
  return {
    id: doc.id,
    name: doc.name ?? '',
    code: doc.code ?? '',
  };
}

export default function AdminLanguagesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Column-based search states
  const [nameSearch, setNameSearch] = useState('');
  const [codeSearch, setCodeSearch] = useState('');

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const languagesCollection = useMemoFirebase(() => collection(firestore, 'languages'), [firestore]);
  const { data, isLoading } = useCollection(languagesCollection);

  const languages = useMemo(() => {
    if (!data) return [];
    return data.map(mapLanguage).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Apply column-based filtering
  const filteredLanguages = useMemo(() => {
    return languages.filter((language) => {
      const matchesName = !nameSearch || language.name.toLowerCase().includes(nameSearch.toLowerCase());
      const matchesCode = !codeSearch || (language.code ?? '').toLowerCase().includes(codeSearch.toLowerCase());
      return matchesName && matchesCode;
    });
  }, [languages, nameSearch, codeSearch]);

  const {
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    paginatedItems,
    pageCount,
    filteredCount,
  } = useSearchPagination({
    items: filteredLanguages,
    filter: (language, term) => {
      const haystack = `${language.name} ${language.code ?? ''}`.toLowerCase();
      return haystack.includes(term);
    },
  });

  const form = useForm<LanguageFormValues>({
    resolver: zodResolver(languageSchema),
    defaultValues: {
      name: '',
      code: '',
    },
  });

  const openCreateDialog = () => {
    setSelectedLanguage(null);
    form.reset({ name: '', code: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (language: Language) => {
    setSelectedLanguage(language);
    form.reset({
      name: language.name,
      code: language.code ?? '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: LanguageFormValues) => {
    setIsSubmitting(true);
    try {
      await requireAppCheckToken();
      const id = selectedLanguage ? selectedLanguage.id : doc(collection(firestore, 'languages')).id;
      await setDoc(
        doc(firestore, 'languages', id),
        {
          name: values.name.trim(),
          code: values.code?.trim() || null,
        },
        { merge: true }
      );

      toast({
        title: selectedLanguage ? 'Language updated' : 'Language added',
        description: `"${values.name}" is now available in the library.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to save language.';
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (language: Language) => {
    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'languages', language.id));
      toast({
        title: 'Language removed',
        description: `"${language.name}" is no longer available.`,
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to delete language.';
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description,
      });
    }
  };

  // Export to TXT file
  const handleExportTxt = () => {
    const content = languages.map((lang) => `${lang.name}${lang.code ? `\t${lang.code}` : ''}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `languages_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Export successful',
      description: `${languages.length} languages exported to TXT file.`,
    });
  };

  // Import from file
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportText(text);
      setIsImportDialogOpen(true);
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Process import from textarea
  const handleImport = async () => {
    if (!importText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: 'Please enter data to import.',
      });
      return;
    }

    setIsImporting(true);
    try {
      await requireAppCheckToken();
      const lines = importText.split('\n').filter((line) => line.trim());
      const batch = writeBatch(firestore);
      let count = 0;

      for (const line of lines) {
        const parts = line.split('\t').map((p) => p.trim());
        if (parts[0]) {
          const newDocRef = doc(collection(firestore, 'languages'));
          batch.set(newDocRef, {
            name: parts[0],
            code: parts[1] || null,
          });
          count++;
        }
      }

      await batch.commit();
      toast({
        title: 'Import successful',
        description: `${count} languages imported successfully.`,
      });
      setIsImportDialogOpen(false);
      setImportText('');
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to import languages.';
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description,
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Toggle selection for single item
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map((item) => item.id)));
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = confirm(`Are you sure you want to delete ${selectedIds.size} language(s)?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await requireAppCheckToken();
      const batch = writeBatch(firestore);

      selectedIds.forEach((id) => {
        batch.delete(doc(firestore, 'languages', id));
      });

      await batch.commit();
      toast({
        title: 'Languages deleted',
        description: `${selectedIds.size} language(s) deleted successfully.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to delete languages.';
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Tour Languages</h1>
          <p className="text-muted-foreground">
            Manage the languages offered by guides across finished tours.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash className="mr-2 h-4 w-4" />
              )}
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportTxt}>
            <Download className="mr-2 h-4 w-4" />
            Export TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('import-file-languages')?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import File
          </Button>
          <input
            id="import-file-languages"
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" size="sm" onClick={() => {
            setImportText('');
            setIsImportDialogOpen(true);
          }}>
            <FileText className="mr-2 h-4 w-4" />
            Import Text
          </Button>
          <Button onClick={openCreateDialog}>Add Language</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-headline">Language Library</CardTitle>
            <CardDescription>Keep this list in sync with active guide capabilities.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search languages…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="md:w-64"
            />
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="md:w-[140px]">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={paginatedItems.length > 0 && selectedIds.size === paginatedItems.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>
                  <Input
                    placeholder="Search name..."
                    value={nameSearch}
                    onChange={(e) => setNameSearch(e.target.value)}
                    className="h-8"
                  />
                </TableHead>
                <TableHead>
                  <Input
                    placeholder="Search code..."
                    value={codeSearch}
                    onChange={(e) => setCodeSearch(e.target.value)}
                    className="h-8"
                  />
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {filteredCount === 0 && languages.length > 0
                      ? 'No languages match your search.'
                      : 'No languages have been added yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((language) => (
                  <TableRow
                    key={language.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEditDialog(language)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(language.id)}
                        onCheckedChange={() => toggleSelection(language.id)}
                        aria-label={`Select ${language.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{language.name}</TableCell>
                    <TableCell>{language.code || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(language)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(language)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pageCount > 1 && (
            <PaginationControls currentPage={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLanguage ? 'Edit Language' : 'Add Language'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="French" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="fr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Languages</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Enter one language per line. Format: <code className="text-xs bg-muted px-1 py-0.5 rounded">Name[TAB]Code</code>
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Example:<br />
                <code className="text-xs bg-muted px-1 py-0.5 rounded">English	en</code><br />
                <code className="text-xs bg-muted px-1 py-0.5 rounded">French	fr</code>
              </p>
              <Textarea
                placeholder="English&#9;en&#10;French&#9;fr&#10;Spanish&#9;es"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
