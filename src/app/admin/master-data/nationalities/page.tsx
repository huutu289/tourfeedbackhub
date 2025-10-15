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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase/provider';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { requireAppCheckToken } from '@/lib/admin/app-check';
import { useSearchPagination } from '@/hooks/use-search-pagination';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/admin/pagination-controls';

const nationalitySchema = z.object({
  name: z.string().min(1, 'Nationality is required'),
  code: z.string().optional(),
});

type NationalityFormValues = z.infer<typeof nationalitySchema>;

interface Nationality {
  id: string;
  name: string;
  code?: string;
}

function mapNationality(doc: WithId<any>): Nationality {
  return {
    id: doc.id,
    name: doc.name ?? '',
    code: doc.code ?? '',
  };
}

export default function AdminNationalitiesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNationality, setSelectedNationality] = useState<Nationality | null>(null);

  const nationalitiesCollection = useMemoFirebase(() => collection(firestore, 'nationalities'), [firestore]);
  const { data, isLoading } = useCollection(nationalitiesCollection);

  const nationalities = useMemo(() => {
    if (!data) return [];
    return data.map(mapNationality).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

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
    items: nationalities,
    filter: (nationality, term) => {
      const haystack = `${nationality.name} ${nationality.code ?? ''}`.toLowerCase();
      return haystack.includes(term);
    },
  });

  const form = useForm<NationalityFormValues>({
    resolver: zodResolver(nationalitySchema),
    defaultValues: {
      name: '',
      code: '',
    },
  });

  const openCreateDialog = () => {
    setSelectedNationality(null);
    form.reset({ name: '', code: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (nationality: Nationality) => {
    setSelectedNationality(nationality);
    form.reset({ name: nationality.name, code: nationality.code ?? '' });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: NationalityFormValues) => {
    setIsSubmitting(true);
    try {
      await requireAppCheckToken();
      const id = selectedNationality ? selectedNationality.id : doc(collection(firestore, 'nationalities')).id;
      await setDoc(
        doc(firestore, 'nationalities', id),
        {
          name: values.name.trim(),
          code: values.code?.trim() || null,
        },
        { merge: true }
      );

      toast({
        title: selectedNationality ? 'Nationality updated' : 'Nationality added',
        description: `"${values.name}" is now available when capturing guest origins.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to save nationality.';
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (nationality: Nationality) => {
    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'nationalities', nationality.id));
      toast({
        title: 'Nationality removed',
        description: `"${nationality.name}" has been deleted.`,
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to delete nationality.';
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Guest Nationalities</h1>
          <p className="text-muted-foreground">
            Maintain a clean list of guest nationalities for finished tour diaries.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Add Nationality</Button>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-headline">Nationality Library</CardTitle>
            <CardDescription>Used when capturing finished tour guest demographics.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search nationalities…"
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
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    {filteredCount === 0 && nationalities.length > 0
                      ? 'No nationalities match your search.'
                      : 'No nationalities have been added yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((nationality) => (
                  <TableRow key={nationality.id}>
                    <TableCell className="font-medium">{nationality.name}</TableCell>
                    <TableCell>{nationality.code || '—'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(nationality)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(nationality)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            <DialogTitle>{selectedNationality ? 'Edit Nationality' : 'Add Nationality'}</DialogTitle>
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
                      <Input placeholder="Australia" {...field} />
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
                      <Input placeholder="AU" {...field} />
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

