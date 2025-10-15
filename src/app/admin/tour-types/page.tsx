'use client';

import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase/provider";
import { collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/firestore/use-memo-firebase";
import { useCollection, type WithId } from "@/firebase/firestore/use-collection";
import type { TourType } from "@/lib/types";
import { requireAppCheckToken } from "@/lib/admin/app-check";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { useSearchPagination } from "@/hooks/use-search-pagination";

const tourTypeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().or(z.literal("")).optional(),
  order: z.coerce.number().min(0, "Order must be zero or positive").optional(),
});

type TourTypeFormValues = z.infer<typeof tourTypeSchema>;

function mapTourType(doc: WithId<any>): WithId<TourType> {
  return {
    id: doc.id,
    title: doc.title ?? doc.name ?? "Untitled",
    description: doc.description ?? "",
    icon: doc.icon ?? undefined,
    order: typeof doc.order === "number" ? doc.order : Number(doc.order) || undefined,
  };
}

export default function AdminTourTypesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTourType, setSelectedTourType] = useState<WithId<TourType> | null>(null);
  const [tourTypeToDelete, setTourTypeToDelete] = useState<WithId<TourType> | null>(null);

  const tourTypesRef = useMemoFirebase(
    () => collection(firestore, "tourTypes"),
    [firestore]
  );
  const { data, isLoading } = useCollection(tourTypesRef);

  const tourTypes = useMemo(() => {
    if (!data) return [];
    return data.map(mapTourType).sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.title.localeCompare(b.title);
    });
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
    items: tourTypes,
    filter: (item, term) => {
      const combined = `${item.title} ${item.description}`.toLowerCase();
      return combined.includes(term);
    },
  });

  const form = useForm<TourTypeFormValues>({
    resolver: zodResolver(tourTypeSchema),
    defaultValues: {
      title: "",
      description: "",
      icon: "",
      order: tourTypes.length + 1,
    },
  });

  const handleOpenCreate = () => {
    setSelectedTourType(null);
    form.reset({
      title: "",
      description: "",
      icon: "",
      order: tourTypes.length + 1,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (tourType: WithId<TourType>) => {
    setSelectedTourType(tourType);
    form.reset({
      title: tourType.title,
      description: tourType.description,
      icon: tourType.icon ?? "",
      order: tourType.order ?? 0,
    });
    setIsDialogOpen(true);
  };

  const saveTourType = async (values: TourTypeFormValues) => {
    await requireAppCheckToken();
    const id = selectedTourType
      ? selectedTourType.id
      : doc(collection(firestore, "tourTypes")).id;

    const payload: TourType = {
      id,
      title: values.title.trim(),
      description: values.description.trim(),
      icon: values.icon?.trim() || undefined,
      order:
        typeof values.order === "number" && !Number.isNaN(values.order)
          ? values.order
          : tourTypes.length + 1,
    };

    await setDoc(doc(firestore, "tourTypes", id), payload, { merge: true });
    toast({
      title: selectedTourType ? "Tour type updated" : "Tour type created",
      description: `"${payload.title}" is ready for use.`,
    });
  };

  const onSubmit = async (values: TourTypeFormValues) => {
    setIsSubmitting(true);
    try {
      await saveTourType(values);
      setIsDialogOpen(false);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Failed to save tour type.";
      toast({
        title: "Save failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!tourTypeToDelete) return;
    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, "tourTypes", tourTypeToDelete.id));
      toast({
        title: "Tour type deleted",
        description: `"${tourTypeToDelete.title}" has been removed.`,
      });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Failed to delete tour type.";
      toast({
        title: "Delete failed",
        description,
        variant: "destructive",
      });
    } finally {
      setTourTypeToDelete(null);
    }
  };

  const handleDuplicate = async (tourType: WithId<TourType>) => {
    try {
      await requireAppCheckToken();
      const newId = doc(collection(firestore, "tourTypes")).id;
      const payload: TourType = {
        ...tourType,
        id: newId,
        title: `${tourType.title} (Copy)`,
      };
      await setDoc(doc(firestore, "tourTypes", newId), payload);
      toast({
        title: "Tour type duplicated",
        description: `"${tourType.title}" copied successfully.`,
      });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Failed to duplicate tour type.";
      toast({
        title: "Duplicate failed",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Tour Types</h1>
          <p className="text-muted-foreground">
            Define the categories that tours can be grouped under.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>Add Tour Type</Button>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-headline">Tour Type Library</CardTitle>
            <CardDescription>Organise and reuse tour categories across the site.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search tour types…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="md:w-64"
            />
            <Select
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
            >
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
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead className="w-[80px] text-right">Order</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {filteredCount === 0 && tourTypes.length > 0
                      ? "No tour types match your search."
                      : "No tour types have been created yet."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((tourType) => (
                  <TableRow key={tourType.id}>
                    <TableCell className="font-medium">{tourType.title}</TableCell>
                    <TableCell className="max-w-lg truncate">{tourType.description}</TableCell>
                    <TableCell>{tourType.icon ?? "—"}</TableCell>
                    <TableCell className="text-right">{tourType.order ?? "—"}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(tourType)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(tourType)}>
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setTourTypeToDelete(tourType)}
                          >
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
            <PaginationControls
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTourType ? "Edit Tour Type" : "Add Tour Type"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. landmark" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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

      <AlertDialog
        open={Boolean(tourTypeToDelete)}
        onOpenChange={(open) => {
          if (!open) setTourTypeToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tour type</AlertDialogTitle>
            <AlertDialogDescription>
              {tourTypeToDelete
                ? `Are you sure you want to delete "${tourTypeToDelete.title}"? This action cannot be undone.`
                : "Are you sure you want to delete this tour type?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
