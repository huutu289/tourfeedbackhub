'use client';

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MoreHorizontal, Download, Upload, FileText, Pencil, Trash2, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase/provider";
import { collection, deleteDoc, doc, setDoc, Timestamp, writeBatch } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/firestore/use-memo-firebase";
import { useCollection, type WithId } from "@/firebase/firestore/use-collection";
import type { Story } from "@/lib/types";
import { requireAppCheckToken } from "@/lib/admin/app-check";
import { uploadStoryCover } from "@/lib/cloud-functions-client";
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const coverImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [draftStoryId, setDraftStoryId] = useState<string | null>(null);

  const resetCoverImageSelection = () => {
    if (coverImageFileInputRef.current) {
      coverImageFileInputRef.current.value = '';
    }
    setCoverImageFile(null);
  };

  const handleCoverFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCoverImageFile(file);
  };

  // Column-based search states
  const [titleSearch, setTitleSearch] = useState('');
  const [excerptSearch, setExcerptSearch] = useState('');

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  // Apply column-based filtering
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchesTitle = !titleSearch || story.title.toLowerCase().includes(titleSearch.toLowerCase());
      const matchesExcerpt = !excerptSearch || story.excerpt.toLowerCase().includes(excerptSearch.toLowerCase());
      return matchesTitle && matchesExcerpt;
    });
  }, [stories, titleSearch, excerptSearch]);

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
    items: filteredStories,
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
    resetCoverImageSelection();
    setDraftStoryId(null);
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
    resetCoverImageSelection();
    setDraftStoryId(story.id);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: StoryFormValues) => {
    setIsSubmitting(true);
    try {
      await requireAppCheckToken();
      const existingId = selectedStory ? selectedStory.id : draftStoryId;
      const id = existingId ?? doc(collection(firestore, "stories")).id;
      if (!selectedStory && !draftStoryId) {
        setDraftStoryId(id);
      }
      const storyRef = doc(firestore, "stories", id);

      let coverImageUrl = values.coverImageUrl?.trim() ?? "";

      if (coverImageFile) {
        try {
          coverImageUrl = await uploadStoryCover(id, coverImageFile);
        } catch (uploadError) {
          console.error('Story cover upload failed:', uploadError);
          throw uploadError instanceof Error
            ? uploadError
            : new Error('Failed to upload cover image.');
        }
      }

      const payload: Story = {
        id,
        title: values.title.trim(),
        excerpt: values.excerpt.trim(),
        coverImageUrl,
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
      resetCoverImageSelection();
      setDraftStoryId(null);
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

  // Export to TXT file
  const handleExportTxt = () => {
    const content = stories.map((story) =>
      `${story.title}\t${story.excerpt}\t${story.coverImageUrl || ''}\t${formatDateInput(story.publishedAt)}\t${story.readTimeMinutes || ''}`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stories_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Export successful',
      description: `${stories.length} stories exported to TXT file.`,
    });
  };

  // Import from file
  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
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
          const newDocRef = doc(collection(firestore, 'stories'));
          const publishedAt = parts[3] ? parseDateInput(parts[3]) : new Date();
          batch.set(newDocRef, {
            id: newDocRef.id,
            title: parts[0],
            excerpt: parts[1] || '',
            coverImageUrl: parts[2] || '',
            publishedAt: Timestamp.fromDate(publishedAt),
            readTimeMinutes: parts[4] ? Number(parts[4]) : undefined,
          });
          count++;
        }
      }

      await batch.commit();
      toast({
        title: 'Import successful',
        description: `${count} stories imported successfully.`,
      });
      setIsImportDialogOpen(false);
      setImportText('');
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to import stories.';
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
    if (selectedIds.size === paginatedStories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedStories.map((story) => story.id)));
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = confirm(`Are you sure you want to delete ${selectedIds.size} story(s)?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await requireAppCheckToken();
      const batch = writeBatch(firestore);

      selectedIds.forEach((id) => {
        batch.delete(doc(firestore, 'stories', id));
      });

      await batch.commit();
      toast({
        title: 'Stories deleted',
        description: `${selectedIds.size} story(s) deleted successfully.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to delete stories.';
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
          <h1 className="text-3xl font-headline font-bold">Stories</h1>
          <p className="text-muted-foreground">
            Publish travel journals and updates that inspire travellers.
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
            onClick={() => document.getElementById('import-file-stories')?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import File
          </Button>
          <input
            id="import-file-stories"
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
          <Button onClick={handleAdd}>Add Story</Button>
        </div>
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={paginatedStories.length > 0 && selectedIds.size === paginatedStories.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Excerpt</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Read time</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>
                  <Input
                    placeholder="Search title..."
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    className="h-8"
                  />
                </TableHead>
                <TableHead>
                  <Input
                    placeholder="Search excerpt..."
                    value={excerptSearch}
                    onChange={(e) => setExcerptSearch(e.target.value)}
                    className="h-8"
                  />
                </TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                  </TableCell>
                </TableRow>
              ) : paginatedStories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {filteredCount === 0 && stories.length > 0
                      ? "No stories match your search."
                      : "No stories have been published yet."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStories.map((story) => (
                  <TableRow
                    key={story.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEdit(story)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(story.id)}
                        onCheckedChange={() => toggleSelection(story.id)}
                        aria-label={`Select ${story.title}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{story.title}</TableCell>
                    <TableCell className="max-w-xl truncate">{story.excerpt}</TableCell>
                    <TableCell>{format(story.publishedAt, "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      {story.readTimeMinutes ? `${story.readTimeMinutes} min` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(story)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setStoryToDelete(story)}
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
            <PaginationControls
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetCoverImageSelection();
            setDraftStoryId(null);
          }
        }}
      >
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
              <div className="space-y-2">
                <FormLabel>Upload cover image</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  ref={coverImageFileInputRef}
                  onChange={handleCoverFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  {coverImageFile
                    ? `Selected: ${coverImageFile.name}. The file uploads when you save.`
                    : "Optional. Uploading fills the cover image URL automatically on save."}
                </p>
              </div>
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

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Stories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Enter one story per line. Format: <code className="text-xs bg-muted px-1 py-0.5 rounded">Title[TAB]Excerpt[TAB]ImageURL[TAB]Date[TAB]ReadTime</code>
              </p>
              <Textarea
                placeholder="Story Title&#9;Story excerpt...&#9;https://image.url&#9;2025-01-15&#9;5"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
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
