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
import { MultiSelect } from '@/components/ui/multi-select';

const guideSchema = z.object({
  name: z.string().min(1, 'Guide name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  languageIds: z.array(z.string()).default([]),
  provinceIds: z.array(z.string()).default([]),
  nationalityIds: z.array(z.string()).default([]),
});

type GuideFormValues = z.infer<typeof guideSchema>;

interface Guide {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  languageIds?: string[];
  provinceIds?: string[];
  nationalityIds?: string[];
}

function mapGuide(doc: WithId<any>): Guide {
  return {
    id: doc.id,
    name: doc.name ?? '',
    phone: doc.phone ?? '',
    email: doc.email ?? '',
    languageIds: Array.isArray(doc.languageIds) ? doc.languageIds : [],
    provinceIds: Array.isArray(doc.provinceIds) ? doc.provinceIds : [],
    nationalityIds: Array.isArray(doc.nationalityIds) ? doc.nationalityIds : [],
  };
}

interface MasterOption {
  value: string;
  label: string;
}

export default function AdminGuidesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  // Column-based search states
  const [nameSearch, setNameSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const guidesCollection = useMemoFirebase(() => collection(firestore, 'guides'), [firestore]);
  const languagesCollection = useMemoFirebase(() => collection(firestore, 'languages'), [firestore]);
  const provincesCollection = useMemoFirebase(() => collection(firestore, 'provinces'), [firestore]);
  const nationalitiesCollection = useMemoFirebase(() => collection(firestore, 'nationalities'), [firestore]);

  const { data: guideDocs, isLoading } = useCollection(guidesCollection);
  const { data: languageDocs } = useCollection(languagesCollection);
  const { data: provinceDocs } = useCollection(provincesCollection);
  const { data: nationalityDocs } = useCollection(nationalitiesCollection);

  const guides = useMemo(() => {
    if (!guideDocs) return [];
    return guideDocs.map(mapGuide).sort((a, b) => a.name.localeCompare(b.name));
  }, [guideDocs]);

  // Apply column-based filtering
  const filteredGuides = useMemo(() => {
    return guides.filter((guide) => {
      const matchesName = !nameSearch || guide.name.toLowerCase().includes(nameSearch.toLowerCase());
      const matchesContact = !contactSearch ||
        (guide.phone ?? '').toLowerCase().includes(contactSearch.toLowerCase()) ||
        (guide.email ?? '').toLowerCase().includes(contactSearch.toLowerCase());
      return matchesName && matchesContact;
    });
  }, [guides, nameSearch, contactSearch]);

  const languageOptions: MasterOption[] = useMemo(() => {
    if (!languageDocs) return [];
    return languageDocs
      .map((doc) => ({ value: doc.id, label: doc.name ?? doc.code ?? doc.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [languageDocs]);

  const provinceOptions: MasterOption[] = useMemo(() => {
    if (!provinceDocs) return [];
    return provinceDocs
      .map((doc) => ({ value: doc.id, label: doc.name ?? doc.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [provinceDocs]);

  const nationalityOptions: MasterOption[] = useMemo(() => {
    if (!nationalityDocs) return [];
    return nationalityDocs
      .map((doc) => ({ value: doc.id, label: doc.name ?? doc.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [nationalityDocs]);

  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    languageOptions.forEach((option) => map.set(option.value, option.label));
    provinceOptions.forEach((option) => map.set(option.value, option.label));
    nationalityOptions.forEach((option) => map.set(option.value, option.label));
    return map;
  }, [languageOptions, provinceOptions, nationalityOptions]);

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
    items: filteredGuides,
    filter: (guide, term) => {
      const haystack = `${guide.name} ${guide.phone ?? ''} ${guide.email ?? ''}`.toLowerCase();
      return haystack.includes(term);
    },
  });

  const form = useForm<GuideFormValues>({
    resolver: zodResolver(guideSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      languageIds: [],
      provinceIds: [],
      nationalityIds: [],
    },
  });

  const openCreateDialog = () => {
    setSelectedGuide(null);
    form.reset({
      name: '',
      phone: '',
      email: '',
      languageIds: [],
      provinceIds: [],
      nationalityIds: [],
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (guide: Guide) => {
    setSelectedGuide(guide);
    form.reset({
      name: guide.name,
      phone: guide.phone ?? '',
      email: guide.email ?? '',
      languageIds: guide.languageIds ?? [],
      provinceIds: guide.provinceIds ?? [],
      nationalityIds: guide.nationalityIds ?? [],
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: GuideFormValues) => {
    setIsSubmitting(true);
    try {
      await requireAppCheckToken();
      const id = selectedGuide ? selectedGuide.id : doc(collection(firestore, 'guides')).id;
      await setDoc(
        doc(firestore, 'guides', id),
        {
          name: values.name.trim(),
          phone: values.phone?.trim() || null,
          email: values.email?.trim() || null,
          languageIds: values.languageIds,
          provinceIds: values.provinceIds,
          nationalityIds: values.nationalityIds,
        },
        { merge: true }
      );

      toast({
        title: selectedGuide ? 'Guide updated' : 'Guide added',
        description: `"${values.name}" is now available for finished tour assignments.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to save guide.';
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (guide: Guide) => {
    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'guides', guide.id));
      toast({
        title: 'Guide removed',
        description: `"${guide.name}" has been deleted.`,
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to delete guide.';
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description,
      });
    }
  };

  const resolveLabels = (ids?: string[]) => {
    if (!ids || ids.length === 0) return '—';
    return ids
      .map((id) => labelMap.get(id) ?? id)
      .filter(Boolean)
      .join(', ');
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

    const confirmed = confirm(`Are you sure you want to delete ${selectedIds.size} guide(s)?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await requireAppCheckToken();
      const batch = writeBatch(firestore);

      selectedIds.forEach((id) => {
        batch.delete(doc(firestore, 'guides', id));
      });

      await batch.commit();
      toast({
        title: 'Guides deleted',
        description: `${selectedIds.size} guide(s) deleted successfully.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to delete guides.';
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
          <h1 className="text-3xl font-headline font-bold">Guides</h1>
          <p className="text-muted-foreground">
            Maintain the master list of guides and their service capabilities.
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
          <Button onClick={openCreateDialog}>Add Guide</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-headline">Guide Directory</CardTitle>
            <CardDescription>Used when assigning guides to finished tour diaries.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search guides…"
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
                <TableHead>Contact</TableHead>
                <TableHead>Languages</TableHead>
                <TableHead>Provinces</TableHead>
                <TableHead>Nationalities</TableHead>
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
                    placeholder="Search contact..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="h-8"
                  />
                </TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {filteredCount === 0 && guides.length > 0
                      ? 'No guides match your search.'
                      : 'No guides have been added yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((guide) => (
                  <TableRow
                    key={guide.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEditDialog(guide)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(guide.id)}
                        onCheckedChange={() => toggleSelection(guide.id)}
                        aria-label={`Select ${guide.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{guide.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {guide.phone || '—'}
                      {guide.email ? <br /> : null}
                      {guide.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{resolveLabels(guide.languageIds)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{resolveLabels(guide.provinceIds)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{resolveLabels(guide.nationalityIds)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(guide)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(guide)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGuide ? 'Edit Guide' : 'Add Guide'}</DialogTitle>
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
                      <Input placeholder="Guide name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="guide@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="languageIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Languages</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={languageOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select languages"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provinceIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provinces</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={provinceOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select provinces"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nationalityIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred nationalities</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={nationalityOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select nationalities"
                      />
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
    </div>
  );
}

