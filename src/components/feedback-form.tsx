"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { StarRating } from "@/components/star-rating";
import { countries, languages } from "@/lib/data";
import type { Tour } from "@/lib/types";
import { useRecaptchaEnterprise } from "@/hooks/use-recaptcha-enterprise";
import { submitFeedbackToCloudFunctions } from "@/lib/cloud-functions-client";

const feedbackFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  country: z.string().min(1, "Please select your country."),
  language: z.string().min(1, "Please select your language."),
  rating: z.number().min(1, "Please provide a rating.").max(5),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters.")
    .max(1000, "Message must be 1000 characters or less."),
  tourId: z.string().optional(),
  photo: z
    .any()
    .optional()
    .refine((value) => {
      if (!value || value.length === 0) return true;
      const file: File = value[0];
      return file.size <= 10 * 1024 * 1024;
    }, "Photo must be smaller than 10MB."),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

interface FeedbackFormProps {
  tours: Pick<Tour, "id" | "name">[];
}

export default function FeedbackForm({ tours }: FeedbackFormProps) {
  const { toast } = useToast();
  const { isReady: isRecaptchaReady, execute, error: recaptchaError } = useRecaptchaEnterprise({
    action: "feedback_submit",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tourOptions = useMemo(() => tours.map((tour) => ({ id: tour.id, name: tour.name })), [tours]);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      name: "",
      country: "",
      language: "en",
      rating: 0,
      message: "",
      tourId: "",
    },
  });

  const onSubmit = async (data: FeedbackFormValues) => {
    if (!isRecaptchaReady) {
      toast({
        title: "Spam protection not ready",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const recaptchaToken = await execute();
      const photoFile = data.photo && data.photo.length > 0 ? (data.photo[0] as File) : null;

      await submitFeedbackToCloudFunctions(
        {
          name: data.name.trim(),
          country: data.country,
          language: data.language,
          rating: data.rating,
          message: data.message.trim(),
          tourId: data.tourId ? data.tourId : undefined,
          recaptchaToken,
          hasAttachment: Boolean(photoFile),
          attachmentMetadata: photoFile
            ? {
                fileName: photoFile.name,
                contentType: photoFile.type,
                size: photoFile.size,
              }
            : null,
        },
        photoFile
      );

      toast({
        title: "Feedback Submitted!",
        description: "Thank you for sharing your experience with us.",
      });
      form.reset();
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {recaptchaError && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {recaptchaError.message}
          </p>
        )}
        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Overall Rating</FormLabel>
              <FormControl>
                <StarRating rating={field.value} setRating={(value) => field.onChange(value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="tourId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Which tour did you take? (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tour" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tourOptions.map((tour) => (
                      <SelectItem key={tour.id} value={tour.id}>
                        {tour.name}
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
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <FormLabel>Your Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your experience..."
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="photo"
          render={({ field: { onChange, ...rest } }) => (
            <FormItem>
              <FormLabel>Add a photo (optional)</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={isSubmitting || !isRecaptchaReady}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Feedback
        </Button>
      </form>
    </Form>
  );
}
