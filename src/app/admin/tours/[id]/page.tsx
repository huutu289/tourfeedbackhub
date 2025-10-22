'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {useParams, useRouter} from 'next/navigation';
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Tv,
} from 'lucide-react';
import {z} from 'zod';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {collection, deleteDoc, doc, getDoc, setDoc} from 'firebase/firestore';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {MultiSelect, type MultiSelectOption} from '@/components/ui/multi-select';
import {Combobox, type ComboboxOption} from '@/components/ui/combobox';
import {MediaLibrary} from '@/components/admin/media-library';
import {useToast} from '@/hooks/use-toast';
import {useFirestore} from '@/firebase/provider';
import {useMemoFirebase} from '@/firebase/firestore/use-memo-firebase';
import {useCollection, type WithId} from '@/firebase/firestore/use-collection';
import type {MediaItem, Tour} from '@/lib/types';
import {countries, citiesByCountry} from '@/lib/data';
import {vietnamProvinces} from '@/lib/vietnam-provinces';
import {requireAppCheckToken} from '@/lib/admin/app-check';

const tourSchema = z.object({
  code: z.string().min(1, 'Tour code is required'),
  name: z.string().min(1, 'Title is required'),
  summary: z.string().min(1, 'Summary is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  clientCount: z.coerce.number().min(1, 'Client count must be at least 1'),
  clientNationalityIds: z.array(z.string()).min(1, 'Select at least one nationality'),
  clientCountry: z.string().min(1, 'Country is required'),
  clientCity: z.string().min(1, 'City is required'),
  provinceIds: z.array(z.string()).default([]),
  itinerary: z.string().min(1, 'Detailed itinerary is required'),
  guideId: z.string().optional(),
  guideLanguageIds: z.array(z.string()).min(1, 'Select at least one language'),
  tourTypeIds: z.array(z.string()).min(1, 'Select at least one tour type'),
});

type TourFormValues = z.infer<typeof tourSchema>;

const FINISHED_TOUR_STATUS: Tour['status'] = 'finished';

type SelectedMedia = {
  url: string;
  mediaType: 'image' | 'video';
  fileName?: string;
};

type SimpleOption = {value: string; label: string};

function formatDateInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function matchNamesToIds(names: string[], options: SimpleOption[]): string[] {
  if (!names || names.length === 0) return [];
  const lookup = new Map(options.map((option) => [option.label.toLowerCase(), option.value]));
  return names
    .map((name) => lookup.get(name.toLowerCase()))
    .filter((value): value is string => Boolean(value));
}

function mapTour(doc: WithId<any>): WithId<Tour> {
  const startDate = doc.startDate instanceof Date ? doc.startDate : new Date(doc.startDate);
  const endDate = doc.endDate instanceof Date ? doc.endDate : new Date(doc.endDate);

  const photoUrls = Array.isArray(doc.photoUrls)
    ? doc.photoUrls
    : Array.isArray(doc.mediaUrls)
      ? doc.mediaUrls
      : [];
  const videoUrls = Array.isArray(doc.videoUrls) ? doc.videoUrls : [];
  const clientNationalities = Array.isArray(doc.clientNationalities)
    ? doc.clientNationalities
    : typeof doc.clientNationalities === 'string'
      ? doc.clientNationalities.split(/[,;\n]/).map((item: string) => item.trim()).filter(Boolean)
      : [];
  const clientNationalityIds = Array.isArray(doc.clientNationalityIds) ? doc.clientNationalityIds : [];
  const provinces = Array.isArray(doc.provinces) ? doc.provinces : [];
  const provinceIds = Array.isArray(doc.provinceIds) ? doc.provinceIds : [];
  const guideLanguages = Array.isArray(doc.guideLanguages)
    ? doc.guideLanguages
    : doc.guideLanguage
      ? [doc.guideLanguage]
      : [];
  const guideLanguageIds = Array.isArray(doc.guideLanguageIds) ? doc.guideLanguageIds : [];

  return {
    id: doc.id,
    code: doc.code ?? doc.tourCode ?? `FT-${doc.id}`,
    name: doc.name ?? 'Untitled tour',
    summary: doc.summary ?? '',
    startDate,
    endDate,
    clientCount: Number(doc.clientCount) || 0,
    clientNationalities,
    clientNationalityIds,
    clientCountry: doc.clientCountry ?? '',
    clientCity: doc.clientCity ?? '',
    provinces,
    provinceIds,
    itinerary: doc.itinerary ?? '',
    photoUrls,
    videoUrls,
    tourTypeIds: Array.isArray(doc.tourTypeIds) ? doc.tourTypeIds : undefined,
    guideId: doc.guideId ?? undefined,
    guideName: doc.guideName ?? '',
    guideLanguages,
    guideLanguageIds,
    status: doc.status ?? FINISHED_TOUR_STATUS,
  };
}

function toSelectedMedia(urls: string[], mediaType: SelectedMedia['mediaType']): SelectedMedia[] {
  return urls.map((url) => ({
    url,
    mediaType,
    fileName: url.split('/').pop(),
  }));
}

function mergeMedia(existing: SelectedMedia[], incoming: SelectedMedia[]): SelectedMedia[] {
  const existingUrls = new Set(existing.map((item) => item.url));
  const filtered = incoming.filter((item) => !existingUrls.has(item.url));
  return [...existing, ...filtered];
}

export default function TourEditorPage() {
  const params = useParams<{id: string}>();
  const router = useRouter();
  const firestore = useFirestore();
  const {toast} = useToast();

  const tourIdParam = params?.id;
  const isNewTour = !tourIdParam || tourIdParam === 'new';

  const guidesCollection = useMemoFirebase(() => collection(firestore, 'guides'), [firestore]);
  const languagesCollection = useMemoFirebase(() => collection(firestore, 'languages'), [firestore]);
  const nationalitiesCollection = useMemoFirebase(() => collection(firestore, 'nationalities'), [firestore]);
  const tourTypesCollection = useMemoFirebase(() => collection(firestore, 'tourTypes'), [firestore]);

  const {data: guideDocs} = useCollection(guidesCollection);
  const {data: languageDocs} = useCollection(languagesCollection);
  const {data: nationalityDocs} = useCollection(nationalitiesCollection);
  const {data: tourTypeDocs} = useCollection(tourTypesCollection);

  const guides: Array<{id: string; name: string}> = useMemo(() => {
    if (!guideDocs) return [];
    return guideDocs
      .map((doc) => ({id: doc.id, name: doc.name ?? 'Unnamed guide'}))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [guideDocs]);

  const guideOptions = useMemo<ComboboxOption[]>(() => {
    return guides.map((guide) => ({value: guide.id, label: guide.name}));
  }, [guides]);

  const guideLabelMap = useMemo(() => new Map(guideOptions.map((option) => [option.value, option.label])), [guideOptions]);

  const languageOptions = useMemo<MultiSelectOption[]>(() => {
    if (!languageDocs) return [];
    return languageDocs
      .map((doc) => ({
        value: doc.id,
        label: doc.name ?? doc.code ?? 'Unknown language',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [languageDocs]);

  const languageLabelMap = useMemo(() => new Map(languageOptions.map((option) => [option.value, option.label])), [languageOptions]);

  const nationalityOptions = useMemo<MultiSelectOption[]>(() => {
    if (!nationalityDocs) return [];
    return nationalityDocs
      .map((doc) => ({
        value: doc.id,
        label: doc.name ?? doc.displayName ?? 'Unknown nationality',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [nationalityDocs]);

  const nationalityLabelMap = useMemo(() => new Map(nationalityOptions.map((option) => [option.value, option.label])), [nationalityOptions]);

  const provinceOptions = useMemo<MultiSelectOption[]>(() => {
    return vietnamProvinces.map((province) => ({
      value: province.code,
      label: province.name,
    }));
  }, []);

  const provinceLabelMap = useMemo(() => new Map(provinceOptions.map((option) => [option.value, option.label])), [provinceOptions]);

  const tourTypeOptions = useMemo<MultiSelectOption[]>(() => {
    if (!tourTypeDocs) return [];
    return tourTypeDocs
      .map((doc) => ({
        value: doc.id,
        label: doc.title ?? 'Untitled type',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tourTypeDocs]);

  const form = useForm<TourFormValues>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      code: '',
      name: '',
      summary: '',
      startDate: '',
      endDate: '',
      clientCount: 1,
      clientNationalityIds: [],
      clientCountry: '',
      clientCity: '',
      provinceIds: [],
      itinerary: '',
      guideId: undefined,
      guideLanguageIds: [],
      tourTypeIds: [],
    },
  });

  const [photoMedia, setPhotoMedia] = useState<SelectedMedia[]>([]);
  const [videoMedia, setVideoMedia] = useState<SelectedMedia[]>([]);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [loadedTour, setLoadedTour] = useState<WithId<Tour> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingTour, setLoadingTour] = useState(!isNewTour);
  const hasInitializedFormRef = useRef(false);

  const watchCountry = form.watch('clientCountry');

  const countryOptions = useMemo<ComboboxOption[]>(() => {
    return countries.map((country) => ({value: country.name, label: country.name}));
  }, []);

  const cityOptions = useMemo<ComboboxOption[]>(() => {
    if (!watchCountry) return [];
    const cities = citiesByCountry[watchCountry] ?? [];
    return cities.map((city) => ({value: city, label: city}));
  }, [watchCountry]);

  useEffect(() => {
    if (isNewTour) {
      setLoadingTour(false);
      return;
    }

    let isMounted = true;
    const loadTour = async () => {
      setLoadingTour(true);
      try {
        const tourRef = doc(firestore, 'tours', tourIdParam);
        const snapshot = await getDoc(tourRef);
        if (!snapshot.exists()) {
          toast({
            variant: 'destructive',
            title: 'Tour not found',
            description: 'The requested tour could not be located.',
          });
          router.replace('/admin/tours');
          return;
        }

        if (isMounted) {
          const mapped = mapTour({id: snapshot.id, ...snapshot.data()});
          setLoadedTour(mapped);
          setPhotoMedia(toSelectedMedia(mapped.photoUrls ?? [], 'image'));
          setVideoMedia(toSelectedMedia(mapped.videoUrls ?? [], 'video'));
        }
      } catch (error) {
        console.error('Failed to load tour:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to load tour',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
        router.replace('/admin/tours');
      } finally {
        if (isMounted) {
          setLoadingTour(false);
        }
      }
    };

    loadTour();
    return () => {
      isMounted = false;
    };
  }, [firestore, isNewTour, router, toast, tourIdParam]);

  useEffect(() => {
    if (isNewTour) return;
    if (!loadedTour) return;
    if (hasInitializedFormRef.current) return;

    const languageIds = loadedTour.guideLanguageIds?.length
      ? loadedTour.guideLanguageIds
      : matchNamesToIds(loadedTour.guideLanguages ?? [], languageOptions);

    const existingProvinceIds =
      loadedTour.provinceIds && loadedTour.provinceIds.length > 0
        ? loadedTour.provinceIds
        : matchNamesToIds(loadedTour.provinces ?? [], provinceOptions);

    const nationalityIds = loadedTour.clientNationalityIds?.length
      ? loadedTour.clientNationalityIds
      : matchNamesToIds(loadedTour.clientNationalities ?? [], nationalityOptions);

    const guideOption = guideOptions.find((option) => option.label.toLowerCase() === loadedTour.guideName?.toLowerCase());

    form.reset({
      code: loadedTour.code,
      name: loadedTour.name,
      summary: loadedTour.summary,
      startDate: formatDateInput(loadedTour.startDate),
      endDate: formatDateInput(loadedTour.endDate),
      clientCount: loadedTour.clientCount || 1,
      clientNationalityIds: nationalityIds,
      clientCountry: loadedTour.clientCountry,
      clientCity: loadedTour.clientCity,
      provinceIds: existingProvinceIds,
      itinerary: loadedTour.itinerary,
      guideId: loadedTour.guideId ?? guideOption?.value ?? undefined,
      guideLanguageIds: languageIds,
      tourTypeIds: loadedTour.tourTypeIds ?? [],
    });

    hasInitializedFormRef.current = true;
  }, [
    form,
    guideOptions,
    isNewTour,
    languageOptions,
    loadedTour,
    nationalityOptions,
    provinceOptions,
  ]);

  const handleMediaSelection = (items: SelectedMedia[]) => {
    const images = items.filter((item) => item.mediaType === 'image');
    const videos = items.filter((item) => item.mediaType === 'video');

    if (images.length > 0) {
      setPhotoMedia((prev) => mergeMedia(prev, images));
    }
    if (videos.length > 0) {
      setVideoMedia((prev) => mergeMedia(prev, videos));
    }
  };

  const handleMediaLibrarySelect = (items: MediaItem[]) => {
    const acceptable = items.filter((item) => item.mediaType === 'image' || item.mediaType === 'video');
    if (acceptable.length === 0) return;

    const normalized: SelectedMedia[] = acceptable.map((item) => ({
      url: item.url,
      mediaType: item.mediaType === 'video' ? 'video' : 'image',
      fileName: item.fileName,
    }));
    handleMediaSelection(normalized);
  };

  const removePhoto = (url: string) => {
    setPhotoMedia((prev) => prev.filter((item) => item.url !== url));
  };

  const removeVideo = (url: string) => {
    setVideoMedia((prev) => prev.filter((item) => item.url !== url));
  };

  const onSubmit = async (values: TourFormValues) => {
    setIsSubmitting(true);
    try {
      await requireAppCheckToken();
      const toursCollection = collection(firestore, 'tours');
      const newId = doc(toursCollection).id;
      const documentId = isNewTour ? newId : (loadedTour?.id ?? tourIdParam);
      const tourRef = doc(firestore, 'tours', documentId);

      const languageNames = values.guideLanguageIds
        .map((languageId) => languageLabelMap.get(languageId))
        .filter((label): label is string => Boolean(label));

      const provinceNames = values.provinceIds
        .map((provinceId) => provinceLabelMap.get(provinceId))
        .filter((label): label is string => Boolean(label));

      const nationalityNames = values.clientNationalityIds
        .map((nationalityId) => nationalityLabelMap.get(nationalityId))
        .filter((label): label is string => Boolean(label));

      const guideId = values.guideId?.trim() ? values.guideId.trim() : undefined;
      const guideName = guideId
        ? guideLabelMap.get(guideId) ?? ''
        : loadedTour?.guideId
          ? ''
          : loadedTour?.guideName ?? '';

      const photoUrls = photoMedia.map((item) => item.url);
      const videoUrls = videoMedia.map((item) => item.url);

      const payload: Tour = {
        id: documentId,
        code: values.code.trim(),
        name: values.name.trim(),
        summary: values.summary.trim(),
        startDate: parseDateInput(values.startDate),
        endDate: parseDateInput(values.endDate),
        clientCount: Number(values.clientCount),
        clientNationalities: nationalityNames,
        clientNationalityIds: values.clientNationalityIds,
        clientCountry: values.clientCountry.trim(),
        clientCity: values.clientCity.trim(),
        provinces: provinceNames,
        provinceIds: values.provinceIds,
        itinerary: values.itinerary.trim(),
        photoUrls,
        videoUrls,
        tourTypeIds: values.tourTypeIds,
        guideId,
        guideName,
        guideLanguages: languageNames,
        guideLanguageIds: values.guideLanguageIds,
        status: FINISHED_TOUR_STATUS,
      };

      await setDoc(tourRef, payload, {merge: true});

      toast({
        title: 'Tour saved',
        description: `"${payload.name}" has been saved successfully.`,
      });

      if (isNewTour) {
        router.replace(`/admin/tours/${documentId}`);
        setLoadedTour({...payload, id: documentId});
        hasInitializedFormRef.current = true;
      }
    } catch (error) {
      console.error('Failed to save tour:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save tour right now.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!loadedTour) return;
    if (!confirm(`Delete "${loadedTour.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'tours', loadedTour.id));
      toast({
        title: 'Tour deleted',
        description: `"${loadedTour.name}" has been removed.`,
      });
      router.push('/admin/tours');
    } catch (error) {
      console.error('Failed to delete tour:', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete tour right now.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const pageTitle = isNewTour ? 'Add Finished Tour' : 'Edit Finished Tour';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="ghost" asChild className="w-full sm:w-auto justify-start">
            <Link href="/admin/tours">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tours
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{pageTitle}</h1>
            {!isNewTour && loadedTour && (
              <p className="text-sm text-muted-foreground mt-1">
                Tour code: <span className="font-medium">{loadedTour.code}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={() => setMediaLibraryOpen(true)}
            className="w-full sm:w-auto"
          >
            Manage Media
          </Button>
          {!isNewTour && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          )}
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {loadingTour ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading tour details…</p>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tour Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Tour Code</FormLabel>
                        <FormControl>
                          <Input placeholder="FT-2024-01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Northern Vietnam Discovery" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Summary</FormLabel>
                        <FormControl>
                          <Textarea rows={4} placeholder="Concise highlight of the finished tour" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="itinerary"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Detailed Itinerary</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={8}
                            placeholder="Outline each day or key moment. Use line breaks to separate entries."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Media Library</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setMediaLibraryOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      Browse Media Library
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Upload or select existing assets, then choose items to attach here.
                    </p>
                  </div>

                  <section>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Photos ({photoMedia.length})
                    </h3>
                    {photoMedia.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No photos attached yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {photoMedia.map((item) => (
                          <div key={item.url} className="group relative overflow-hidden rounded-md border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.url}
                              alt={item.fileName ?? 'Tour photo'}
                              className="h-32 w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(item.url)}
                              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm opacity-0 transition group-hover:opacity-100"
                              title="Remove photo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Tv className="h-4 w-4" />
                      Videos ({videoMedia.length})
                    </h3>
                    {videoMedia.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No videos attached yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {videoMedia.map((item) => (
                          <div key={item.url} className="relative rounded-md border">
                            <video className="h-40 w-full rounded-t-md bg-black" controls>
                              <source src={item.url} />
                            </video>
                            <div className="flex items-center justify-between px-3 py-2 text-sm">
                              <span className="truncate">{item.fileName ?? 'Video'}</span>
                              <button
                                type="button"
                                onClick={() => removeVideo(item.url)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground shadow-sm"
                                title="Remove video"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Schedule & Guests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
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
                    name="clientCount"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Number of Travellers</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientNationalityIds"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Guest Nationalities</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={nationalityOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select nationalities"
                            searchPlaceholder="Search nationalities…"
                            emptyMessage="No nationalities found."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientCountry"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Primary Country</FormLabel>
                        <FormControl>
                          <Combobox
                            options={countryOptions}
                            value={field.value || undefined}
                            onChange={(value) => field.onChange(value ?? '')}
                            placeholder="Search countries…"
                            searchPlaceholder="Type to search countries…"
                            emptyMessage="No countries found."
                            allowClear
                            clearLabel="Clear country"
                            allowCreate
                            createLabel={(query) => `Use "${query}"`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientCity"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Home City</FormLabel>
                        <FormControl>
                          <Combobox
                            options={cityOptions}
                            value={field.value || undefined}
                            onChange={(value) => field.onChange(value ?? '')}
                            placeholder={watchCountry ? 'Search cities…' : 'Select country first'}
                            searchPlaceholder="Type to search cities…"
                            emptyMessage={watchCountry ? 'No cities found.' : 'Please select a country first.'}
                            allowClear
                            clearLabel="Clear city"
                            allowCreate
                            createLabel={(query) => `Use "${query}"`}
                            disabled={!watchCountry}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="provinceIds"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Vietnam Provinces</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={provinceOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select provinces"
                            searchPlaceholder="Search provinces…"
                            emptyMessage="No provinces found."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Guide & Tour Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="guideId"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Guide</FormLabel>
                        <FormControl>
                          <Combobox
                            options={guideOptions}
                            value={field.value || undefined}
                            onChange={(value) => field.onChange(value ?? '')}
                            placeholder="Select a guide"
                            searchPlaceholder="Search guides…"
                            emptyMessage="No guides found."
                            allowClear
                            clearLabel="Remove guide"
                            disabled={guideOptions.length === 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guideLanguageIds"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Guide Languages</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={languageOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select languages"
                            searchPlaceholder="Search languages…"
                            emptyMessage="No languages found."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tourTypeIds"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Tour Types</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={tourTypeOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select tour types"
                            searchPlaceholder="Search tour types…"
                            emptyMessage="No tour types found."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </form>
        </Form>
      )}

      <MediaLibrary
        open={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        allowMultiple
        onSelectMany={handleMediaLibrarySelect}
      />
    </div>
  );
}
