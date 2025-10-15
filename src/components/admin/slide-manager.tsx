'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import {
  AlertCircle,
  CalendarClock,
  GripVertical,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { useFirebase } from '@/firebase/provider';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { requireAppCheckToken } from '@/lib/admin/app-check';
import type { HeroSlide } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LOCALES = ['en', 'vi'] as const;
const STATUS_OPTIONS = ['draft', 'published'] as const;
const MAX_SLIDES = 7;
const ORDER_GAP = 10;

interface SlideRecord {
  locale?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
  order?: number;
  active?: boolean;
  status?: string;
  overlayOpacity?: number;
  alt?: string | null;
  startAt?: Timestamp | Date | string | null;
  endAt?: Timestamp | Date | string | null;
  updatedBy?: string | null;
  updatedAt?: Timestamp | Date | string | null;
}

const linkSchema = z
  .string({ required_error: 'Button link is required' })
  .min(1, 'Button link is required')
  .refine(
    (value) => {
      if (!value) return false;
      if (value.startsWith('/')) return true;
      if (value.startsWith('#')) return true;
      if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return true;
      return false;
    },
    {
      message: 'Use an internal path, anchor link, or full URL',
    }
  );

const slideSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    subtitle: z.string().optional(),
    buttonText: z.string().min(1, 'CTA label is required'),
    buttonLink: linkSchema,
    imageUrl: z.string().url('Image URL must be a valid URL'),
    overlayOpacity: z.coerce.number().min(0).max(1).optional(),
    alt: z.string().optional(),
    status: z.enum(STATUS_OPTIONS),
    active: z.boolean(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.startAt) {
      const parsed = new Date(values.startAt);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startAt'],
          message: 'Invalid start time',
        });
      }
    }
    if (values.endAt) {
      const parsed = new Date(values.endAt);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endAt'],
          message: 'Invalid end time',
        });
      }
    }
    if (values.startAt && values.endAt) {
      const start = new Date(values.startAt);
      const end = new Date(values.endAt);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endAt'],
          message: 'End time must be after start time',
        });
      }
    }
  });

type SlideFormValues = z.infer<typeof slideSchema>;

interface SlideFormDialogProps {
  open: boolean;
  locale: string;
  initialSlide: HeroSlide | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SlideFormValues) => Promise<void>;
  isSubmitting: boolean;
  firebaseApp: ReturnType<typeof useFirebase>['firebaseApp'];
}

interface SlideListItemProps {
  slide: HeroSlide;
  index: number;
  onEdit: (slide: HeroSlide) => void;
  onDelete: (slide: HeroSlide) => void;
  onToggleActive: (slide: HeroSlide, nextActive: boolean) => void;
  onDragStart: (id: string) => void;
  onDrop: (draggedId: string | null, targetIndex: number) => void;
  onDragEnd: () => void;
  draggedId: string | null;
  isToggling: boolean;
}

function toDate(value: SlideRecord['startAt']): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function mapSlide(doc: WithId<SlideRecord>): HeroSlide {
  return {
    id: doc.id,
    locale: (doc.locale ?? 'en').toLowerCase(),
    title: doc.title ?? 'Untitled slide',
    subtitle: doc.subtitle ?? undefined,
    buttonText: doc.buttonText ?? 'Learn more',
    buttonLink: doc.buttonLink ?? '/',
    imageUrl: doc.imageUrl ?? '',
    order: typeof doc.order === 'number' ? doc.order : Number(doc.order ?? 0) || 0,
    active: typeof doc.active === 'boolean' ? doc.active : true,
    status: doc.status === 'published' ? 'published' : 'draft',
    overlayOpacity: typeof doc.overlayOpacity === 'number' ? doc.overlayOpacity : null,
    alt: doc.alt ?? null,
    startAt: toDate(doc.startAt),
    endAt: toDate(doc.endAt),
    updatedBy: doc.updatedBy ?? null,
    updatedAt: toDate(doc.updatedAt),
  };
}

function formatSchedule(slide: HeroSlide): string | null {
  const { startAt, endAt } = slide;
  if (!startAt && !endAt) return null;

  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (startAt && endAt) {
    return `${formatter.format(startAt)} → ${formatter.format(endAt)}`;
  }
  if (startAt) {
    return `Starts ${formatter.format(startAt)}`;
  }
  if (endAt) {
    return `Ends ${formatter.format(endAt)}`;
  }
  return null;
}

function toDatetimeLocalString(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeOrder(index: number): number {
  return (index + 1) * ORDER_GAP;
}

function reorderSlides(slides: HeroSlide[], draggedId: string | null, targetIndex: number): HeroSlide[] {
  if (!draggedId) return slides;
  const next = [...slides];
  const currentIndex = next.findIndex((item) => item.id === draggedId);
  if (currentIndex === -1) return slides;

  const [dragged] = next.splice(currentIndex, 1);
  const clampedIndex = Math.min(Math.max(targetIndex, 0), next.length);
  next.splice(clampedIndex, 0, dragged);
  return next;
}

export default function SlideManager() {
  const { firestore, firebaseApp, user } = useFirebase();
  const { toast } = useToast();
  const [selectedLocale, setSelectedLocale] = useState<string>(LOCALES[0]);
  const slidesQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, 'siteContentSlides'),
        where('locale', '==', selectedLocale),
        orderBy('order', 'asc')
      ),
    [firestore, selectedLocale]
  );
  const { data: slideDocs, isLoading } = useCollection<SlideRecord>(slidesQuery);

  const slides = useMemo(() => {
    if (!slideDocs) return [];
    return slideDocs.map(mapSlide).sort((a, b) => a.order - b.order);
  }, [slideDocs]);

  const [draftSlides, setDraftSlides] = useState<HeroSlide[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [slideToDelete, setSlideToDelete] = useState<HeroSlide | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setDraftSlides(slides);
    setDraggedId(null);
  }, [slides, selectedLocale]);

  const hasOrderChanges = useMemo(() => {
    if (!slideDocs) return false;
    if (slideDocs.length !== draftSlides.length) return true;
    const originalIds = slideDocs.map((doc) => doc.id);
    const currentIds = draftSlides.map((slide) => slide.id);
    return originalIds.some((id, index) => currentIds[index] !== id);
  }, [draftSlides, slideDocs]);

  const isAtLimit = draftSlides.length >= MAX_SLIDES;

  const handleOpenNew = () => {
    setEditingSlide(null);
    setDialogOpen(true);
  };

  const handleEdit = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setDialogOpen(true);
  };

  const getUpdatedBy = () => user?.email ?? user?.displayName ?? user?.uid ?? 'admin';

  const handleSubmit = async (values: SlideFormValues) => {
    try {
      setIsSubmitting(true);
      await requireAppCheckToken();

      const startDate = values.startAt ? new Date(values.startAt) : null;
      const endDate = values.endAt ? new Date(values.endAt) : null;

      const payload = {
        locale: selectedLocale,
        title: values.title.trim(),
        subtitle: values.subtitle?.trim() || '',
        buttonText: values.buttonText.trim(),
        buttonLink: values.buttonLink.trim(),
        imageUrl: values.imageUrl.trim(),
        overlayOpacity: typeof values.overlayOpacity === 'number' ? Number(values.overlayOpacity.toFixed(2)) : null,
        alt: values.alt?.trim() || null,
        status: values.status,
        active: values.active,
        startAt: startDate ? Timestamp.fromDate(startDate) : null,
        endAt: endDate ? Timestamp.fromDate(endDate) : null,
        updatedAt: serverTimestamp(),
        updatedBy: getUpdatedBy(),
      };

      if (editingSlide) {
        await updateDoc(doc(firestore, 'siteContentSlides', editingSlide.id), payload);
        toast({
          title: 'Slide updated',
          description: `${editingSlide.title} was updated successfully.`,
        });
      } else {
        const nextOrder = draftSlides.reduce((max, slide) => Math.max(max, slide.order), 0) + ORDER_GAP;
        const refDoc = doc(collection(firestore, 'siteContentSlides'));
        await setDoc(refDoc, {
          ...payload,
          order: nextOrder,
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Slide created',
          description: 'A new hero slide is now available in the library.',
        });
      }

      setDialogOpen(false);
      setEditingSlide(null);
    } catch (error) {
      console.error('Failed to save slide', error);
      toast({
        variant: 'destructive',
        title: 'Failed to save slide',
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred while saving the slide.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (slide: HeroSlide, nextActive: boolean) => {
    try {
      setTogglingId(slide.id);
      await requireAppCheckToken();
      await updateDoc(doc(firestore, 'siteContentSlides', slide.id), {
        active: nextActive,
        updatedAt: serverTimestamp(),
        updatedBy: getUpdatedBy(),
      });
      toast({
        title: nextActive ? 'Slide activated' : 'Slide hidden',
        description: `${slide.title} will ${nextActive ? 'now appear' : 'no longer appear'} on the site.`,
      });
    } catch (error) {
      console.error('Failed to toggle slide', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update slide',
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred while updating the slide.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveOrder = async () => {
    if (!hasOrderChanges) return;
    try {
      setIsSavingOrder(true);
      await requireAppCheckToken();
      const batch = writeBatch(firestore);
      draftSlides.forEach((slide, index) => {
        batch.update(doc(firestore, 'siteContentSlides', slide.id), {
          order: normalizeOrder(index),
          updatedAt: serverTimestamp(),
          updatedBy: getUpdatedBy(),
        });
      });
      await batch.commit();
      toast({
        title: 'Order updated',
        description: 'Slides will display in the updated order on the site.',
      });
    } catch (error) {
      console.error('Failed to update slide order', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update order',
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred while updating the order.',
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!slideToDelete) return;
    try {
      setIsDeleting(true);
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'siteContentSlides', slideToDelete.id));
      toast({
        title: 'Slide deleted',
        description: `${slideToDelete.title} has been removed.`,
      });
      setSlideToDelete(null);
    } catch (error) {
      console.error('Failed to delete slide', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete slide',
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred while deleting the slide.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Slide Bar</CardTitle>
              <CardDescription>
                Manage hero slides for each locale. Published slides appear on the homepage carousel.
              </CardDescription>
            </div>
            <Button onClick={handleOpenNew} disabled={isAtLimit}>
              <Plus className="mr-2 h-4 w-4" />
              Add Slide
            </Button>
          </div>
          <Tabs value={selectedLocale} onValueChange={setSelectedLocale} className="w-full">
            <TabsList className="w-fit">
              {LOCALES.map((locale) => (
                <TabsTrigger key={locale} value={locale}>
                  {locale.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {isAtLimit ? (
            <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
              <AlertCircle className="h-4 w-4" />
              <span>
                Maximum of {MAX_SLIDES} slides reached for {selectedLocale.toUpperCase()}. Delete or hide a slide before adding a new
                one.
              </span>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading slides…
            </div>
          ) : draftSlides.length === 0 ? (
            <div className="rounded border border-dashed bg-muted/40 p-8 text-center text-muted-foreground">
              No slides yet. Add your first hero slide to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {draftSlides.map((slide, index) => (
                <SlideListItem
                  key={slide.id}
                  slide={slide}
                  index={index}
                  onEdit={handleEdit}
                  onDelete={setSlideToDelete}
                  onToggleActive={handleToggleActive}
                  onDragStart={setDraggedId}
                  onDrop={(dragged, targetIndex) => {
                    setDraftSlides((prev) => reorderSlides(prev, dragged, targetIndex));
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  draggedId={draggedId}
                  isToggling={togglingId === slide.id}
                />
              ))}
              <div
                onDragOver={(event) => {
                  if (!draggedId) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!draggedId) return;
                  event.preventDefault();
                  setDraftSlides((prev) => reorderSlides(prev, draggedId, prev.length));
                  setDraggedId(null);
                }}
                className="h-6 rounded-md border border-dashed border-transparent text-xs text-muted-foreground"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default" onClick={handleSaveOrder} disabled={!hasOrderChanges || isSavingOrder}>
              {isSavingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save order
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDraftSlides(slides)}
              disabled={!hasOrderChanges || isSavingOrder || isLoading}
            >
              Reset changes
            </Button>
            <div className="text-sm text-muted-foreground">
              Drag a slide by the grip icon to reorder. Order updates affect only {selectedLocale.toUpperCase()} slides.
            </div>
          </div>
        </CardContent>
      </Card>

      <SlideFormDialog
        open={dialogOpen}
        locale={selectedLocale}
        initialSlide={editingSlide}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingSlide(null);
          }
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        firebaseApp={firebaseApp}
      />

      <AlertDialog open={Boolean(slideToDelete)} onOpenChange={(open) => (!open ? setSlideToDelete(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete slide</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The slide will be removed from {slideToDelete?.locale.toUpperCase()} immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SlideListItem({
  slide,
  index,
  onEdit,
  onDelete,
  onToggleActive,
  onDragStart,
  onDrop,
  onDragEnd,
  draggedId,
  isToggling,
}: SlideListItemProps) {
  const isDragging = draggedId === slide.id;
  const schedule = formatSchedule(slide);
  const isUpcoming = slide.startAt ? slide.startAt.getTime() > Date.now() : false;
  const isExpired = slide.endAt ? slide.endAt.getTime() < Date.now() : false;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border bg-card p-4 transition-shadow sm:flex-row sm:items-center sm:gap-6',
        isDragging ? 'border-primary shadow-lg' : 'border-border'
      )}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', slide.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(slide.id);
      }}
      onDragOver={(event) => {
        if (!draggedId || draggedId === slide.id) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const dragged = event.dataTransfer.getData('text/plain') || draggedId;
        onDrop(dragged, index);
        onDragEnd();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center gap-4 sm:w-40">
        <div className="relative h-20 w-32 overflow-hidden rounded-md bg-muted">
          {slide.imageUrl ? (
            <Image src={slide.imageUrl} alt={slide.alt ?? slide.title} fill className="object-cover" sizes="128px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <Badge variant="secondary">#{index + 1}</Badge>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold leading-tight">{slide.title}</h3>
          <Badge variant={slide.status === 'published' ? 'default' : 'outline'}>{slide.status}</Badge>
          <Badge variant={slide.active ? 'secondary' : 'outline'}>{slide.active ? 'Active' : 'Hidden'}</Badge>
          {isUpcoming ? <Badge>Scheduled</Badge> : null}
          {isExpired ? <Badge variant="destructive">Expired</Badge> : null}
        </div>
        {slide.subtitle ? <p className="text-sm text-muted-foreground">{slide.subtitle}</p> : null}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">CTA:</span> {slide.buttonText} → {slide.buttonLink}
        </div>
        {schedule ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            {schedule}
          </div>
        ) : null}
        {slide.updatedBy ? (
          <div className="text-xs text-muted-foreground">
            Updated by {slide.updatedBy}
            {slide.updatedAt
              ? ` on ${new Intl.DateTimeFormat(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(slide.updatedAt)}`
              : ''}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <div className="flex items-center gap-2">
          <Switch
            checked={slide.active}
            onCheckedChange={(checked) => onToggleActive(slide, checked)}
            disabled={isToggling}
            id={`active-${slide.id}`}
          />
          <label htmlFor={`active-${slide.id}`} className="text-sm text-muted-foreground">
            {slide.active ? 'Visible' : 'Hidden'}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(slide)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(slide)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function buildInitialValues(slide: HeroSlide | null): SlideFormValues {
  return {
    title: slide?.title ?? '',
    subtitle: slide?.subtitle ?? '',
    buttonText: slide?.buttonText ?? '',
    buttonLink: slide?.buttonLink ?? '',
    imageUrl: slide?.imageUrl ?? '',
    overlayOpacity: slide?.overlayOpacity ?? 0.3,
    alt: slide?.alt ?? '',
    status: slide?.status ?? 'draft',
    active: slide?.active ?? true,
    startAt: toDatetimeLocalString(slide?.startAt),
    endAt: toDatetimeLocalString(slide?.endAt),
  };
}

function SlideFormDialog({
  open,
  locale,
  initialSlide,
  onOpenChange,
  onSubmit,
  isSubmitting,
  firebaseApp,
}: SlideFormDialogProps) {
  const storage = useMemo(() => getStorage(firebaseApp), [firebaseApp]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<SlideFormValues>({
    resolver: zodResolver(slideSchema),
    defaultValues: buildInitialValues(initialSlide),
  });

  useEffect(() => {
    form.reset(buildInitialValues(initialSlide));
  }, [form, initialSlide, locale]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]+/g, '-');
      const storagePath = `slides/${locale}/${Date.now()}-${safeName}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(storageRef);
      form.setValue('imageUrl', downloadUrl, { shouldDirty: true, shouldTouch: true });
      toast({
        title: 'Image uploaded',
        description: 'The slide image is ready to use.',
      });
    } catch (error) {
      console.error('Slide image upload failed', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred while uploading the image.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const submitHandler = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  const imageUrl = form.watch('imageUrl');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initialSlide ? 'Edit slide' : 'Add slide'} – {locale.toUpperCase()}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submitHandler} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Share Your Journey" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Tell travellers what to expect" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="buttonText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA label</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Leave a review" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="buttonLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA link</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="/reviews" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Hero image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alt"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Image alt text</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Describe the scene for accessibility" />
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status === 'published' ? 'Published' : 'Draft'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="overlayOpacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overlay opacity</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Slider
                          min={0}
                          max={1}
                          step={0.05}
                          value={[field.value ?? 0]}
                          onValueChange={(values) => field.onChange(values[0])}
                        />
                        <div className="text-sm text-muted-foreground">{(field.value ?? 0).toFixed(2)}</div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End time (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel className="mb-2">Active</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        <span className="text-sm text-muted-foreground">
                          Visible to visitors when status is published.
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="relative h-40 w-full overflow-hidden rounded-md bg-muted">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={form.getValues('alt') || 'Slide preview'} fill className="object-cover" sizes="100vw" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm">Preview appears after selecting an image</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleUpload}
                />
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Upload image
                </Button>
                <Textarea
                  readOnly
                  value={imageUrl || 'Image URL will appear here after upload.'}
                  className="min-h-[120px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save slide
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
