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
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal, Star } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase/provider";
import { collection, deleteDoc, deleteField, doc, setDoc, Timestamp } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/firestore/use-memo-firebase";
import { useCollection, type WithId } from "@/firebase/firestore/use-collection";
import type { Review } from "@/lib/types";
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

const reviewSchema = z.object({
  authorDisplay: z.string().min(1, "Name is required"),
  country: z.string().or(z.literal("")).optional(),
  language: z.string().min(2, "Language code is required"),
  rating: z.coerce.number().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  message: z.string().min(1, "Message is required"),
  tourName: z.string().or(z.literal("")).optional(),
  tourId: z.string().or(z.literal("")).optional(),
  status: z.enum(["pending", "approved", "rejected"]),
  summary: z.string().or(z.literal("")).optional(),
  createdAt: z.string().min(1, "Created date is required"),
  photoUrls: z.string().or(z.literal("")).optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

const statusBadgeVariant: Record<Review["status"], "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
};

function mapReview(doc: WithId<any>): WithId<Review> {
  const createdAtValue = doc.createdAt;
  const createdAt =
    createdAtValue instanceof Timestamp
      ? createdAtValue.toDate()
      : typeof createdAtValue?.toDate === "function"
        ? createdAtValue.toDate()
        : new Date();

  return {
    id: doc.id,
    authorDisplay: doc.authorDisplay ?? doc.name ?? "Anonymous",
    country: doc.country ?? "",
    language: doc.language ?? "en",
    rating: typeof doc.rating === "number" ? doc.rating : Number(doc.rating) || 0,
    message: doc.message ?? "",
    tourId: doc.tourId ?? "",
    tourName: doc.tourName ?? "",
    photoUrls: Array.isArray(doc.photoUrls) ? doc.photoUrls : undefined,
    status: doc.status ?? "pending",
    createdAt,
    summary: doc.summary ?? "",
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

function cleanString(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function parsePhotoUrls(raw?: string | null): string[] | undefined {
  if (!raw) return undefined;
  const urls = raw
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter(Boolean);
  return urls.length ? urls : undefined;
}

function joinPhotoUrls(urls?: string[]): string {
  if (!urls || urls.length === 0) return "";
  return urls.join("\n");
}

export default function AdminReviewsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReview, setSelectedReview] = useState<WithId<Review> | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<WithId<Review> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [statusAction, setStatusAction] = useState<{ id: string; status: Review["status"] } | null>(null);

  const reviewsRef = useMemoFirebase(
    () => collection(firestore, "reviews"),
    [firestore]
  );
  const { data, isLoading } = useCollection(reviewsRef);

  const reviews = useMemo(() => {
    if (!data) return [];
    return data
      .map(mapReview)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [data]);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return reviews;
    return reviews.filter((review) => review.status === statusFilter);
  }, [reviews, statusFilter]);

  const {
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedReviews,
    pageCount,
    filteredCount,
  } = useSearchPagination({
    items: filteredByStatus,
    filter: (review, term) => {
      const haystack = `${review.authorDisplay} ${review.message} ${review.tourName} ${review.country}`.toLowerCase();
      return haystack.includes(term);
    },
  });

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      authorDisplay: "",
      country: "",
      language: "en",
      rating: 5,
      message: "",
      tourName: "",
      tourId: "",
      status: "pending",
      summary: "",
      createdAt: formatDateInput(new Date()),
      photoUrls: "",
    },
  });

  const handleEdit = (review: WithId<Review>) => {
    setSelectedReview(review);
    form.reset({
      authorDisplay: review.authorDisplay,
      country: review.country ?? "",
      language: review.language ?? "en",
      rating: review.rating ?? 5,
      message: review.message,
      tourName: review.tourName ?? "",
      tourId: review.tourId ?? "",
      status: review.status,
      summary: review.summary ?? "",
      createdAt: formatDateInput(review.createdAt),
      photoUrls: joinPhotoUrls(review.photoUrls),
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: ReviewFormValues) => {
    if (!selectedReview) return;

    setIsSubmitting(true);
    try {
      await requireAppCheckToken();
      const reviewRef = doc(firestore, "reviews", selectedReview.id);

      const authorDisplay = values.authorDisplay.trim();
      const country = cleanString(values.country) ?? "";
      const language = values.language.trim();
      const rating = Number(values.rating);
      const message = values.message.trim();
      const status = values.status;
      const createdAtDate = parseDateInput(values.createdAt);
      const tourId = cleanString(values.tourId);
      const tourName = cleanString(values.tourName);
      const summary = cleanString(values.summary);
      const photoUrls = parsePhotoUrls(values.photoUrls);

      const writeData: Record<string, unknown> = {
        authorDisplay,
        country,
        language,
        rating,
        message,
        status,
        createdAt: Timestamp.fromDate(createdAtDate),
      };

      if (tourId) {
        writeData.tourId = tourId;
      } else if (selectedReview?.tourId) {
        writeData.tourId = deleteField();
      }

      if (tourName) {
        writeData.tourName = tourName;
      } else if (selectedReview?.tourName) {
        writeData.tourName = deleteField();
      }

      if (summary) {
        writeData.summary = summary;
      } else if (selectedReview?.summary) {
        writeData.summary = deleteField();
      }

      if (photoUrls && photoUrls.length > 0) {
        writeData.photoUrls = photoUrls;
      } else if (selectedReview?.photoUrls?.length) {
        writeData.photoUrls = deleteField();
      }

      await setDoc(reviewRef, writeData, { merge: true });

      toast({
        title: "Review updated",
        description: `"${authorDisplay}" review has been updated.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to save review.";
      toast({
        variant: "destructive",
        title: "Save failed",
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);
    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, "reviews", reviewToDelete.id));
      toast({
        title: "Review deleted",
        description: `"${reviewToDelete.authorDisplay}" has been removed.`,
      });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to delete review.";
      toast({
        variant: "destructive",
        title: "Delete failed",
        description,
      });
    } finally {
      setIsDeleting(false);
      setReviewToDelete(null);
    }
  };

  const updateStatus = async (review: WithId<Review>, status: Review["status"]) => {
    setStatusAction({ id: review.id, status });
    try {
      await requireAppCheckToken();
      await setDoc(
        doc(firestore, "reviews", review.id),
        { status },
        { merge: true }
      );
      toast({
        title: `Review ${status}`,
        description: `"${review.authorDisplay}" marked as ${status}.`,
      });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to update status.";
      toast({
        variant: "destructive",
        title: "Status update failed",
        description,
      });
    } finally {
      setStatusAction(null);
    }
  };

  const isStatusUpdating = (reviewId: string, status: Review["status"]) =>
    statusAction?.id === reviewId && statusAction.status === status;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Reviews</h1>
          <p className="text-muted-foreground">
            Filter, approve, or reject visitor feedback from the public site, Google Reviews, TripAdvisor, and other sources.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-headline">Review Queue</CardTitle>
            <CardDescription>Filter, approve, or reject visitor feedback.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search reviews…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="md:w-64"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="md:w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <TableHead>Guest</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                  </TableCell>
                </TableRow>
              ) : paginatedReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {filteredCount === 0 && filteredByStatus.length > 0
                      ? "No reviews match your search."
                      : "No reviews found for this filter."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="font-medium">{review.authorDisplay}</div>
                      <div className="text-xs text-muted-foreground">
                        {review.country ? `${review.country} · ` : ""}
                        {review.language.toUpperCase()}
                      </div>
                      <div className="text-sm text-muted-foreground max-w-md truncate">
                        {review.summary || review.message}
                      </div>
                    </TableCell>
                    <TableCell>
                      {review.tourName ? (
                        <Badge variant="outline">{review.tourName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span>{review.rating.toFixed(1)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[review.status]}>
                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(review.createdAt, "MMM d, yyyy")}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(review)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={review.status === "approved" || isStatusUpdating(review.id, "approved")}
                            onClick={() => updateStatus(review, "approved")}
                          >
                            {isStatusUpdating(review.id, "approved") ? "Approving…" : "Approve"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={review.status === "pending" || isStatusUpdating(review.id, "pending")}
                            onClick={() => updateStatus(review, "pending")}
                          >
                            {isStatusUpdating(review.id, "pending") ? "Marking…" : "Mark pending"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={review.status === "rejected" || isStatusUpdating(review.id, "rejected")}
                            onClick={() => updateStatus(review, "rejected")}
                          >
                            {isStatusUpdating(review.id, "rejected") ? "Rejecting…" : "Reject"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setReviewToDelete(review)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="authorDisplay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guest name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <FormControl>
                        <Input placeholder="en" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={5} step={0.5} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="createdAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Created date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tourName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tourId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="photoUrls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo URLs (one per line)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="https://example.com/photo.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
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

      <AlertDialog
        open={Boolean(reviewToDelete)}
        onOpenChange={(open) => {
          if (!open) setReviewToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review</AlertDialogTitle>
            <AlertDialogDescription>
              {reviewToDelete
                ? `Are you sure you want to delete "${reviewToDelete.authorDisplay}" review? This action cannot be undone.`
                : "Are you sure you want to delete this review?"}
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
