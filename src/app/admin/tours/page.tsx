'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import type { Tour } from '@/lib/types';
import { setDocumentNonBlocking } from '@/firebase';

const functionsBaseUrl = process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_BASE_URL;

const tourSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  summary: z.string().min(1, 'Summary is required'),
  durationLabel: z.string().min(1, 'Duration is required'),
  priceFrom: z.coerce.number().min(0, 'Price must be a positive number'),
  mediaFiles: z.any().optional(),
});

type TourFormValues = z.infer<typeof tourSchema>;

async function getUploadUrl(
  idToken: string,
  fileName: string,
  fileType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const res = await fetch(`${functionsBaseUrl}/admin-generate-upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fileName, fileType }),
  });
  if (!res.ok) {
    throw new Error('Failed to get upload URL');
  }
  return res.json();
}

async function uploadFile(
  uploadUrl: string,
  file: File
): Promise<void> {
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });
}

function mapTour(doc: WithId<any>): Tour {
  return {
    id: doc.id,
    name: doc.name ?? 'Untitled Tour',
    summary: doc.summary ?? '',
    durationLabel: doc.durationLabel ?? '',
    priceFrom: Number(doc.priceFrom) || 0,
    mediaUrls: Array.isArray(doc.mediaUrls) ? doc.mediaUrls : [],
  };
}

export default function AdminToursPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTour, setSelectedTour] = useState<WithId<Tour> | null>(null);

  const toursQuery = useMemoFirebase(
    () => collection(firestore, 'tours'),
    [firestore]
  );
  const { data, isLoading } = useCollection(toursQuery);

  const tours = useMemo(() => {
    if (!data) return [];
    return data.map(mapTour);
  }, [data]);

  const form = useForm<TourFormValues>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      name: '',
      summary: '',
      durationLabel: '',
      priceFrom: 0,
      mediaFiles: undefined,
    },
  });

  const handleEdit = (tour: WithId<Tour>) => {
    setSelectedTour(tour);
    form.reset({
      name: tour.name,
      summary: tour.summary,
      durationLabel: tour.durationLabel,
      priceFrom: tour.priceFrom,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedTour(null);
    form.reset({
      name: '',
      summary: '',
      durationLabel: '',
      priceFrom: 0,
      mediaFiles: undefined,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: TourFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to perform this action.',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const id = selectedTour ? selectedTour.id : doc(collection(firestore, 'tours')).id;
      const tourRef = doc(firestore, 'tours', id);
      
      let newMediaUrls: string[] = [];

      if (values.mediaFiles && values.mediaFiles.length > 0) {
        const uploadPromises = Array.from(values.mediaFiles as FileList).map(async (file: File) => {
          // 1. Get signed URL
          const { uploadUrl, publicUrl } = await getUploadUrl(idToken, `tours/${id}/${file.name}`, file.type);
          // 2. Upload file to signed URL
          await uploadFile(uploadUrl, file);
          return publicUrl;
        });
        newMediaUrls = await Promise.all(uploadPromises);
      }

      const tourData = {
        name: values.name,
        summary: values.summary,
        durationLabel: values.durationLabel,
        priceFrom: values.priceFrom,
        mediaUrls: [...(selectedTour?.mediaUrls || []), ...newMediaUrls],
        id,
      };

      setDocumentNonBlocking(tourRef, tourData, { merge: true });

      toast({
        title: selectedTour ? 'Tour Updated' : 'Tour Created',
        description: `"${values.name}" has been saved.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving tour:", error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-headline font-bold">Manage Tours</h1>
            <p className="text-muted-foreground">Add, edit, or remove tour packages.</p>
          </div>
          <Button onClick={handleAddNew}>Add New Tour</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-headline">Published Tours</CardTitle>
            <CardDescription>Data is sourced directly from Firestore.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tour Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price (from)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                    </TableCell>
                  </TableRow>
                ) : (
                  tours.map(tour => (
                    <TableRow key={tour.id}>
                      <TableCell className="font-medium">{tour.name}</TableCell>
                      <TableCell>{tour.durationLabel}</TableCell>
                      <TableCell>${tour.priceFrom}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleEdit(tour)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTour ? 'Edit Tour' : 'Add New Tour'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tour Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Summary</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 5 days" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priceFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (from)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mediaFiles"
                render={({ field: { onChange, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Media (Images/Videos)</FormLabel>
                     {selectedTour?.mediaUrls && (
                       <div className="mt-2 flex flex-wrap gap-2">
                         {selectedTour.mediaUrls.map((url) => (
                            <Image key={url} src={url} alt="Current media" width={80} height={60} className="rounded-md object-cover" />
                         ))}
                       </div>
                    )}
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={e => {
                          onChange(e.target.files);
                        }}
                        {...rest}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
