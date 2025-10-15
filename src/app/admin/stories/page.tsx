'use client';

import { useMemo, useState } from "react";
import { format } from "date-fns";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MoreHorizontal } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase/provider";
import { collection, deleteDoc, doc, setDoc, Timestamp } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/firestore/use-memo-firebase";
import { useCollection, type WithId } from "@/firebase/firestore/use-collection";
import type { Story } from "@/lib/types";
import { requireAppCheckToken } from "@/lib/admin/app-check";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { useSearchPagination } from "@/hooks/use-search-pagination";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const storySchema = z.object({
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().min(1, "Excerpt is required"),
  coverImageUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  publishedAt: z.string().min(1, "Published date is required"),
  readTimeMinutes: z.coerce.number().min(0, "Read time must be zero or positive").optional(),
});

type StoryFormValues = z.infer<typeof storySchema>;

function mapStory(doc: WithId<any>): WithId<Story> {
  const publishedAtValue = doc.publishedAt;
  const publishedAt =
    publishedAtValue instanceof Timestamp
      ? publishedAtValue.toDate()
      : typeof publishedAtValue?.toDate === "function"
        ? publishedAtValue.toDate()
        : new Date();

  return {
    id: doc.id,
    title: doc.title ?? "Untitled Story",
    excerpt: doc.excerpt ?? "",
    coverImageUrl: doc.coverImageUrl ?? "",
    publishedAt,
    readTimeMinutes:
      typeof doc.readTimeMinutes === "number"
        ? doc.readTimeMinutes
        : Number(doc.readTimeMinutes) || undefined,
  };
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

export default function AdminStoriesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStory, setSelectedStory] = useState<WithId<Story> | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<WithId<Story> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const storiesRef = useMemoFirebase(
    () => collection(firestore, "stories"),
    [firestore]
  );
  const { data, isLoading } = useCollection(storiesRef);

  const stories = useMemo(() => {
    if (!data) return [];
    return data.map(mapStory).sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }, [data]);

  const {
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedStories,
    pageCount,
    filteredCount,
  } = useSearchPagination({
    items: stories,
    filter: (story, term) => {
      const haystack = `${story.title} ${story.excerpt}`.toLowerCase();
      return haystack.includes(term);
    },
  });

  const form = useForm<StoryFormValues>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      title: "",
      excerpt: "",
      coverImageUrl: "",
      publishedAt: formatDateInput(new Date()),
      readTimeMinutes: 4,
    },
  });

  const handleAdd = () => {
    setSelectedStory(null);
    form.reset({
      title: "",
      excerpt: "",
      coverImageUrl: "",
      publishedAt: formatDateInput(new Date()),
      readTimeMinutes: 4,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (story: WithId<Story>) => {
    setSelectedStory(story);
    form.reset({
      title: story.title,
      excerpt: story.excerpt,
      coverImageUrl: story.coverImageUrl ?? "",
      publishedAt: formatDateInput(story.publishedAt),
      readTimeMinutes: story.readTimeMinutes ?? 4,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: StoryFormValues) => {
    setIsSubmitting(true);
    try {
      await requireAppCheckToken();
      const id = selectedStory ? selectedStory.id : doc(collection(firestore, "stories")).id;
      const storyRef = doc(firestore, "stories", id);

      const payload: Story = {
        id,
        title: values.title.trim(),
        excerpt: values.excerpt.trim(),
        coverImageUrl: values.coverImageUrl?.trim() ?? "",
        publishedAt: parseDateInput(values.publishedAt),
        readTimeMinutes:
          typeof values.readTimeMinutes === "number"
            ? values.readTimeMinutes
            : Number(values.readTimeMinutes) || undefined,
      };

      await setDoc(
        storyRef,
        {
          ...payload,
          publishedAt: Timestamp.fromDate(payload.publishedAt),
        },
        { merge: true }
      );

      toast({
        title: selectedStory ? "Story updated" : "Story created",
        description: `"${payload.title}" has been saved.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to save story.";
      toast({
        variant: "destructive",
        title: "Save failed",
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (story: WithId<Story>) => {
    try {
      await requireAppCheckToken();
      const newId = doc(collection(firestore, "stories")).id;
      const payload: Story = {
        ...story,
        id: newId,
        title: `${story.title} (Copy)`,
      };
      await setDoc(doc(firestore, "stories", newId), {
        ...payload,
        publishedAt: Timestamp.fromDate(payload.publishedAt),
      });
      toast({
        title: "Story duplicated",
        description: `"${story.title}" copied successfully.`,
      });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to duplicate story.";
      toast({
        variant: "destructive",
        title: "Duplicate failed",
        description,
      });
    }
  };

  const handleDelete = async () => {
    if (!storyToDelete) return;
    setIsDeleting(true);
    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, "stories", storyToDelete.id));
      toast({
        title: "Story deleted",
        description: `"${storyToDelete.title}" has been removed.`,
      });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to delete story.";
      toast({
        variant: "destructive",
        title: "Delete failed",
        description,
      });
    } finally {
      setIsDeleting(false);
      setStoryToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Stories</h1>
          <p className="text-muted-foreground">
            Publish travel journals and updates that inspire travellers.
          </p>
        </div>
        <Button onClick={handleAdd}>Add Story</Button>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-headline">Story Library</CardTitle>
            <CardDescription>Keep your narrative content current and on-brand.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search stories…"
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
                <TableHead>Excerpt</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Read time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                  </TableCell>
                </TableRow>
              ) : paginatedStories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {filteredCount === 0 && stories.length > 0
                      ? "No stories match your search."
                      : "No stories have been published yet."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStories.map((story) => (
                  <TableRow key={story.id}>
                    <TableCell className="font-medium">{story.title}</TableCell>
                    <TableCell className="max-w-xl truncate">{story.excerpt}</TableCell>
                    <TableCell>{format(story.publishedAt, "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      {story.readTimeMinutes ? `${story.readTimeMinutes} min` : "—"}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(story)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(story)}>
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setStoryToDelete(story)}
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
            <DialogTitle>{selectedStory ? "Edit Story" : "Add Story"}</DialogTitle>
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
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="publishedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Published date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="readTimeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Read time (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
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
        open={Boolean(storyToDelete)}
        onOpenChange={(open) => {
          if (!open) setStoryToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete story</AlertDialogTitle>
            <AlertDialogDescription>
              {storyToDelete
                ? `Are you sure you want to delete "${storyToDelete.title}"? This action cannot be undone.`
                : "Are you sure you want to delete this story?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
