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

const provinceSchema = z.object({
  name: z.string().min(1, 'Province name is required'),
  country: z.string().optional(),
});

type ProvinceFormValues = z.infer<typeof provinceSchema>;

interface Province {
  id: string;
  name: string;
  country?: string;
}

function mapProvince(doc: WithId<any>): Province {
  return {
    id: doc.id,
    name: doc.name ?? '',
    country: doc.country ?? '',
  };
}

export default function AdminProvincesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);

  const provincesCollection = useMemoFirebase(() => collection(firestore, 'provinces'), [firestore]);
  const { data, isLoading } = useCollection(provincesCollection);

  const provinces = useMemo(() => {
    if (!data) return [];
    return data.map(mapProvince).sort((a, b) => a.name.localeCompare(b.name));
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
    items: provinces,
    filter: (province, term) => {
      const haystack = `${province.name} ${province.country ?? ''}`.toLowerCase();
      return haystack.includes(term);
    },
  });

  const form = useForm<ProvinceFormValues>({
    resolver: zodResolver(provinceSchema),
    defaultValues: {
      name: '',
      country: '',
    },
  });

  const openCreateDialog = () => {
    setSelectedProvince(null);
    form.reset({ name: '', country: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (province: Province) => {
    setSelectedProvince(province);
    form.reset({
      name: province.name,
      country: province.country ?? '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: ProvinceFormValues) => {
    setIsSubmitting(true);
    try {
      await requireAppCheckToken();
      const id = selectedProvince ? selectedProvince.id : doc(collection(firestore, 'provinces')).id;
      await setDoc(
        doc(firestore, 'provinces', id),
        {
          name: values.name.trim(),
          country: values.country?.trim() || null,
        },
        { merge: true }
      );

      toast({
        title: selectedProvince ? 'Province updated' : 'Province added',
        description: `"${values.name}" is ready to use in finished tour entries.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to save province.';
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (province: Province) => {
    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'provinces', province.id));
      toast({
        title: 'Province removed',
        description: `"${province.name}" has been deleted.`,
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to delete province.';
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
          <h1 className="text-3xl font-headline font-bold">Provinces</h1>
          <p className="text-muted-foreground">
            Catalogue the provinces where guides regularly deliver finished tours.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Add Province</Button>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-headline">Province Library</CardTitle>
            <CardDescription>Keep this aligned with your field operations.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search provinces…"
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
                <TableHead>Country</TableHead>
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
                    {filteredCount === 0 && provinces.length > 0
                      ? 'No provinces match your search.'
                      : 'No provinces have been added yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((province) => (
                  <TableRow key={province.id}>
                    <TableCell className="font-medium">{province.name}</TableCell>
                    <TableCell>{province.country || '—'}</TableCell>
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
                          <DropdownMenuItem onClick={() => openEditDialog(province)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(province)}>
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
            <DialogTitle>{selectedProvince ? 'Edit Province' : 'Add Province'}</DialogTitle>
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
                      <Input placeholder="Da Nang" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Vietnam" {...field} />
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

