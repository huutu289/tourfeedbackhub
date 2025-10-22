'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const commentSchema = z.object({
  authorName: z.string().min(1, 'Please tell us your name'),
  rating: z.coerce.number().min(1).max(5),
  message: z.string().min(1, 'Share a few words about the guide'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface FinishedTourCommentFormProps {
  tourId: string;
}

export function FinishedTourCommentForm({ tourId }: FinishedTourCommentFormProps) {
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      authorName: '',
      rating: 5,
      message: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const onSubmit = async (values: CommentFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/finished-tours/${tourId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorName: values.authorName,
          rating: Number(values.rating),
          message: values.message,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unable to submit comment.' }));
        throw new Error(data.error ?? 'Unable to submit comment.');
      }

      toast({
        title: 'Thank you!',
        description: 'Your guide feedback was submitted for review. It will appear once approved by our team.',
      });
      form.reset({ authorName: '', rating: 5, message: '' });
      router.refresh();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Could not submit comment.';
      toast({
        title: 'Submission failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="authorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your name</FormLabel>
              <FormControl>
                <Input placeholder="How should we credit you?" {...field} />
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
              <FormLabel>Guide rating (1-5)</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={5} step={0.5} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your comments</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Share how the guide supported your journey." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Feedback is reviewed by our editors before it appears on this diary.
          </p>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Send guide feedback'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
