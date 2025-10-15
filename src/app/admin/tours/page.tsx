'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { Loader2, MoreHorizontal, Download, Upload, FileText, Pencil, Trash2, Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase/provider';
import { collection, deleteDoc, doc, setDoc, writeBatch } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import type { Tour } from '@/lib/types';
import { requireAppCheckToken } from '@/lib/admin/app-check';
import { uploadTourMedia } from '@/lib/cloud-functions-client';
import { useSearchPagination } from '@/hooks/use-search-pagination';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { countries, citiesByCountry } from '@/lib/data';
import { vietnamProvinces } from '@/lib/vietnam-provinces';

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

interface GuideRecord {
  id: string;
  name: string;
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
    name: doc.name ?? 'Untitled diary',
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

function matchNamesToIds(names: string[], options: MultiSelectOption[]): string[] {
  if (!names || names.length === 0) return [];
  const lookup = new Map(options.map((option) => [option.label.toLowerCase(), option.value]));
  return names
    .map((name) => lookup.get(name.toLowerCase()))
    .filter((value): value is string => Boolean(value));
}

export default function AdminFinishedToursPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTour, setSelectedTour] = useState<WithId<Tour> | null>(null);
  const [tourToDelete, setTourToDelete] = useState<WithId<Tour> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Column-based search states
  const [codeSearch, setCodeSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toursCollection = useMemoFirebase(() => collection(firestore, 'tours'), [firestore]);
  const guidesCollection = useMemoFirebase(() => collection(firestore, 'guides'), [firestore]);
  const languagesCollection = useMemoFirebase(() => collection(firestore, 'languages'), [firestore]);
  const nationalitiesCollection = useMemoFirebase(() => collection(firestore, 'nationalities'), [firestore]);
  const tourTypesCollection = useMemoFirebase(() => collection(firestore, 'tourTypes'), [firestore]);

  const { data, isLoading } = useCollection(toursCollection);
  const { data: guideDocs } = useCollection(guidesCollection);
  const { data: languageDocs } = useCollection(languagesCollection);
  const { data: nationalityDocs } = useCollection(nationalitiesCollection);
  const { data: tourTypeDocs } = useCollection(tourTypesCollection);

  const guides: GuideRecord[] = useMemo(() => {
    if (!guideDocs) return [];
    return guideDocs
      .map((doc) => ({ id: doc.id, name: doc.name ?? 'Unnamed guide' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [guideDocs]);

  const guideOptions = useMemo<ComboboxOption[]>(() => {
    return guides.map((guide) => ({ value: guide.id, label: guide.name }));
  }, [guides]);

  const countryOptions = useMemo<ComboboxOption[]>(() => {
    return countries
      .map((country) => ({
        value: country.name,
        label: country.name,
        hint: country.code,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const languageOptions = useMemo<MultiSelectOption[]>(() => {
    if (!languageDocs) return [];
    return languageDocs
      .map((doc) => ({ value: doc.id, label: doc.name ?? doc.code ?? doc.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [languageDocs]);

  const provinceOptions = useMemo<MultiSelectOption[]>(() => {
    return vietnamProvinces.map((province) => ({
      value: province,
      label: province,
    }));
  }, []);

  const nationalityOptions = useMemo<MultiSelectOption[]>(() => {
    if (!nationalityDocs) return [];
    return nationalityDocs
      .map((doc) => ({ value: doc.id, label: doc.name ?? doc.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [nationalityDocs]);

  const tourTypeOptions = useMemo<MultiSelectOption[]>(() => {
    if (!tourTypeDocs) return [];
    return tourTypeDocs
      .map((doc) => ({ value: doc.id, label: doc.title ?? doc.name ?? doc.id, order: doc.order }))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [tourTypeDocs]);

  const languageLabelMap = useMemo(() => new Map(languageOptions.map((option) => [option.value, option.label])), [languageOptions]);
  const provinceLabelMap = useMemo(() => new Map(provinceOptions.map((option) => [option.value, option.label])), [provinceOptions]);
  const nationalityLabelMap = useMemo(() => new Map(nationalityOptions.map((option) => [option.value, option.label])), [nationalityOptions]);
  const guideLabelMap = useMemo(() => new Map(guideOptions.map((option) => [option.value, option.label])), [guideOptions]);
  const tourTypeLabelMap = useMemo(() => new Map(tourTypeOptions.map((option) => [option.value, option.label])), [tourTypeOptions]);

  const tours = useMemo(() => {
    if (!data) return [];
    return data
      .map(mapTour)
      .filter((tour) => tour.status === FINISHED_TOUR_STATUS)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [data]);

  const filteredTours = useMemo(() => {
    return tours.filter((tour) => {
      const matchesCode = !codeSearch || tour.code.toLowerCase().includes(codeSearch.toLowerCase());
      const matchesName = !nameSearch || tour.name.toLowerCase().includes(nameSearch.toLowerCase());
      return matchesCode && matchesName;
    });
  }, [tours, codeSearch, nameSearch]);

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
    items: filteredTours,
    filter: (tour, term) => {
      const haystack = `${tour.code} ${tour.name} ${tour.guideName} ${tour.summary}`.toLowerCase();
      return haystack.includes(term);
    },
  });

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

  const watchCountry = form.watch('clientCountry');
  const homeCityPlaceholder = watchCountry ? `e.g. City in ${watchCountry}` : 'e.g. Melbourne';

  const cityOptions = useMemo<ComboboxOption[]>(() => {
    if (!watchCountry) return [];
    const cities = citiesByCountry[watchCountry] ?? [];
    return cities.map((city) => ({ value: city, label: city }));
  }, [watchCountry]);

  const resetMediaInput = () => {
    if (mediaFileInputRef.current) {
      mediaFileInputRef.current.value = '';
    }
  };

  const matchByName = (name: string): string | undefined => {
    const option = guideOptions.find((option) => option.label.toLowerCase() === name.toLowerCase());
    return option?.value;
  };

  const handleAddTour = () => {
    setSelectedTour(null);
    form.reset({
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
    });
    resetMediaInput();
    setIsDialogOpen(true);
  };

  const handleEditTour = (tour: WithId<Tour>) => {
    setSelectedTour(tour);
    const languageIds = tour.guideLanguageIds?.length
      ? tour.guideLanguageIds
      : matchNamesToIds(tour.guideLanguages ?? [], languageOptions);
    const normalizedProvinceIds =
      tour.provinceIds?.filter((provinceId) =>
        provinceOptions.some((option) => option.value === provinceId)
      ) ?? [];
    const provinceIds =
      normalizedProvinceIds.length > 0
        ? normalizedProvinceIds
        : matchNamesToIds(tour.provinces ?? [], provinceOptions);
    const nationalityIds = tour.clientNationalityIds?.length
      ? tour.clientNationalityIds
      : matchNamesToIds(tour.clientNationalities ?? [], nationalityOptions);
    const guideId = tour.guideId ?? (tour.guideName ? matchByName(tour.guideName) : undefined);
    const tourTypeIds = tour.tourTypeIds ?? [];

    form.reset({
      code: tour.code,
      name: tour.name,
      summary: tour.summary,
      startDate: tour.startDate ? formatDateInput(tour.startDate) : '',
      endDate: tour.endDate ? formatDateInput(tour.endDate) : '',
      clientCount: tour.clientCount,
      clientNationalityIds: nationalityIds,
      clientCountry: tour.clientCountry,
      clientCity: tour.clientCity,
      provinceIds,
      itinerary: tour.itinerary,
      guideId,
      guideLanguageIds: languageIds,
      tourTypeIds,
    });
    resetMediaInput();
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: TourFormValues) => {
    setIsSubmitting(true);
    try {
      await requireAppCheckToken();
      const id = selectedTour ? selectedTour.id : doc(collection(firestore, 'tours')).id;
      const tourRef = doc(firestore, 'tours', id);

      const existingPhotos = selectedTour?.photoUrls ?? [];
      const existingVideos = selectedTour?.videoUrls ?? [];
      const mediaFiles = mediaFileInputRef.current?.files;
      const newPhotoUrls: string[] = [];
      const newVideoUrls: string[] = [];

      if (mediaFiles && mediaFiles.length > 0) {
        try {
          const uploads = Array.from(mediaFiles).map(async (file) => {
            console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);
            const url = await uploadTourMedia(id, file);
            console.log(`Upload successful: ${file.name} -> ${url}`);
            if (file.type.startsWith('video/')) {
              newVideoUrls.push(url);
            } else {
              newPhotoUrls.push(url);
            }
          });
          await Promise.all(uploads);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          throw new Error(
            uploadError instanceof Error
              ? `Upload failed: ${uploadError.message}`
              : 'Upload failed due to an unknown error'
          );
        }
      }

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
        : selectedTour?.guideId
          ? ''
          : selectedTour?.guideName ?? '';

      const payload: Tour = {
        id,
        code: values.code.trim(),
        name: values.name.trim(),
        summary: values.summary.trim(),
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
        clientCount: Number(values.clientCount),
        clientNationalities: nationalityNames,
        clientNationalityIds: values.clientNationalityIds,
        clientCountry: values.clientCountry.trim(),
        clientCity: values.clientCity.trim(),
        provinces: provinceNames,
        provinceIds: values.provinceIds,
        itinerary: values.itinerary.trim(),
        photoUrls: [...existingPhotos, ...newPhotoUrls],
        videoUrls: [...existingVideos, ...newVideoUrls],
        tourTypeIds: values.tourTypeIds,
        guideId,
        guideName,
        guideLanguages: languageNames,
        guideLanguageIds: values.guideLanguageIds,
        status: FINISHED_TOUR_STATUS,
      };

      await setDoc(
        tourRef,
        {
          ...payload,
          startDate: payload.startDate,
          endDate: payload.endDate,
        },
        { merge: true }
      );

      toast({
        title: selectedTour ? 'Finished tour updated' : 'Finished tour created',
        description: `"${payload.name}" is now published in the diary library.`,
      });

      setIsDialogOpen(false);
      resetMediaInput();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (tour: WithId<Tour>) => {
    try {
      await requireAppCheckToken();
      const newId = doc(collection(firestore, 'tours')).id;
      const payload: Tour = {
        ...tour,
        id: newId,
        code: `${tour.code}-COPY`,
        name: `${tour.name} (Copy)`,
        status: FINISHED_TOUR_STATUS,
      };
      await setDoc(doc(firestore, 'tours', newId), payload);
      toast({
        title: 'Finished tour duplicated',
        description: `"${tour.name}" has been duplicated.`,
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to duplicate tour.';
      toast({
        variant: 'destructive',
        title: 'Duplicate failed',
        description,
      });
    }
  };

  const handleDelete = async () => {
    if (!tourToDelete) return;
    setIsDeleting(true);
    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'tours', tourToDelete.id));
      toast({
        title: 'Finished tour deleted',
        description: `"${tourToDelete.name}" has been removed from the diary.`,
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to delete tour.';
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description,
      });
    } finally {
      setIsDeleting(false);
      setTourToDelete(null);
    }
  };

  const formatDateInput = (date: Date | string): string => {
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Export to TXT file
  const handleExportTxt = () => {
    const content = tours.map((tour) =>
      `${tour.code}\t${tour.name}\t${formatDateInput(tour.startDate)}\t${formatDateInput(tour.endDate)}\t${tour.clientCount}\t${tour.clientCountry}\t${tour.clientCity}\t${tour.guideName || ''}`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tours_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Export successful',
      description: `${tours.length} tours exported to TXT file.`,
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
    event.target.value = '';
  };

  // Process import (simplified - basic fields only)
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
        if (parts[0] && parts[1]) {
          const newDocRef = doc(collection(firestore, 'tours'));
          batch.set(newDocRef, {
            id: newDocRef.id,
            code: parts[0],
            name: parts[1],
            summary: '',
            startDate: parts[2] ? new Date(parts[2]) : new Date(),
            endDate: parts[3] ? new Date(parts[3]) : new Date(),
            clientCount: parts[4] ? Number(parts[4]) : 1,
            clientNationalities: [],
            clientNationalityIds: [],
            clientCountry: parts[5] || '',
            clientCity: parts[6] || '',
            provinces: [],
            provinceIds: [],
            itinerary: '',
            photoUrls: [],
            videoUrls: [],
            guideName: parts[7] || '',
            guideLanguages: [],
            guideLanguageIds: [],
            status: FINISHED_TOUR_STATUS,
          });
          count++;
        }
      }
      await batch.commit();
      toast({
        title: 'Import successful',
        description: `${count} tours imported successfully.`,
      });
      setIsImportDialogOpen(false);
      setImportText('');
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to import tours.';
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description,
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Toggle selection
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
    const confirmed = confirm(`Are you sure you want to delete ${selectedIds.size} tour(s)?`);
    if (!confirmed) return;
    setIsBulkDeleting(true);
    try {
      await requireAppCheckToken();
      const batch = writeBatch(firestore);
      selectedIds.forEach((id) => {
        batch.delete(doc(firestore, 'tours', id));
      });
      await batch.commit();
      toast({
        title: 'Tours deleted',
        description: `${selectedIds.size} tour(s) deleted successfully.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unable to delete tours.';
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description,
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-headline font-bold">Finished Tours</h1>
            <p className="text-muted-foreground">
              Chronicle completed journeys and share them with future travellers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? (
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
              onClick={() => document.getElementById('import-file-tours')?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import File
            </Button>
            <input
              id="import-file-tours"
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
            <Button onClick={handleAddTour}>Add Finished Tour</Button>
          </div>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl font-headline">Finished Tour Library</CardTitle>
              <CardDescription>Each entry appears on the public site as a diary post.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                placeholder="Search by code, title, or guide…"
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
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Tour Types</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Guide</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>
                    <Input
                      placeholder="Search code..."
                      value={codeSearch}
                      onChange={(e) => setCodeSearch(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead>
                    <Input
                      placeholder="Search title..."
                      value={nameSearch}
                      onChange={(e) => setNameSearch(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                    </TableCell>
                  </TableRow>
                ) : paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      {filteredCount === 0 && tours.length > 0
                        ? 'No finished tours match your search.'
                        : 'No finished tours have been created yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((tour) => (
                    <TableRow
                      key={tour.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditTour(tour)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(tour.id)}
                          onCheckedChange={() => toggleSelection(tour.id)}
                          aria-label={`Select ${tour.code}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{tour.code}</TableCell>
                      <TableCell>{tour.name}</TableCell>
                      <TableCell>
                        {tour.tourTypeIds?.map(id => tourTypeLabelMap.get(id)).filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        {tour.startDate.toLocaleDateString()} — {tour.endDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>{tour.guideName || '—'}</TableCell>
                      <TableCell>{tour.guideLanguages.join(', ') || '—'}</TableCell>
                      <TableCell>{tour.clientCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditTour(tour)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setTourToDelete(tour)}
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
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTour ? 'Edit Finished Tour' : 'Add Finished Tour'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Journey headline" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Summary</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Write a short overview travellers can scan quickly." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
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
                  render={({ field }) => (
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

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="clientCount"
                  render={({ field }) => (
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
                  name="clientCountry"
                  render={({ field }) => (
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
                  render={({ field }) => (
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
              </div>

              <FormField
                control={form.control}
                name="clientNationalityIds"
                render={({ field }) => (
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
                        searchPlaceholder="Search provinces…"
                        emptyMessage="No provinces found."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tourTypeIds"
                render={({ field }) => (
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

              <FormField
                control={form.control}
                name="itinerary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Itinerary</FormLabel>
                    <FormControl>
                      <Textarea rows={6} placeholder="Use line breaks to separate each day or highlight." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="guideId"
                  render={({ field }) => (
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
                  render={({ field }) => (
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
              </div>

              <div className="space-y-2">
                <FormLabel>Media (Images/Videos)</FormLabel>
                <FormControl>
                  <Input type="file" accept="image/*,video/*" multiple ref={mediaFileInputRef} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Upload photos and videos together. Videos are identified by file type.
                </p>
              </div>

              {selectedTour && (
                <div className="space-y-3">
                  {selectedTour.photoUrls.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Current Photos ({selectedTour.photoUrls.length})</h4>
                      <div className="flex flex-wrap gap-3">
                        {selectedTour.photoUrls.map((url, index) => (
                          <div key={`${selectedTour.id}-photo-${index}`} className="relative">
                            {/* Use regular img tag to avoid Next.js Image Optimization issues with Firebase Storage */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Tour photo ${index + 1}`}
                              width={120}
                              height={90}
                              className="rounded-md object-cover border border-gray-200 bg-gray-100"
                              loading="eager"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-[120px] h-[90px] rounded-md border border-red-300 bg-red-50 flex items-center justify-center text-xs text-red-600">Failed to load</div>`;
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTour.videoUrls.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Current Videos ({selectedTour.videoUrls.length})</h4>
                      <div className="flex flex-wrap gap-3">
                        {selectedTour.videoUrls.map((url, index) => (
                          <video key={`${selectedTour.id}-video-${index}`} controls className="h-24 rounded-md bg-black border border-gray-200">
                            <source src={url} />
                          </video>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
        open={Boolean(tourToDelete)}
        onOpenChange={(open) => {
          if (!open) setTourToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete finished tour</AlertDialogTitle>
            <AlertDialogDescription>
              {tourToDelete
                ? `Are you sure you want to delete "${tourToDelete.name}"? This finished journey will disappear from the public site.`
                : 'Are you sure you want to delete this finished tour?'}
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
            <DialogTitle>Import Tours</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Enter one tour per line. Format: <code className="text-xs bg-muted px-1 py-0.5 rounded">Code[TAB]Name[TAB]StartDate[TAB]EndDate[TAB]ClientCount[TAB]Country[TAB]City[TAB]Guide</code>
              </p>
              <Textarea
                placeholder="FT-001&#9;Amazing Vietnam Tour&#9;2025-01-15&#9;2025-01-20&#9;4&#9;Australia&#9;Sydney&#9;John Doe"
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
    </>
  );
}
