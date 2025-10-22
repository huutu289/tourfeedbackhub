"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CheckCircle, ArrowLeft, ArrowRight, Save } from "lucide-react";
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

const STORAGE_KEY = "tourfeedbackhub-feedback-draft";
const QUICK_INTENT_KEY = "tourfeedbackhub-feedback-intent";

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

const steps = [
  {
    title: "Select your journey",
    description: "Let us know which tour you joined and preferred language.",
  },
  {
    title: "Rate the experience",
    description: "Give your overall star rating.",
  },
  {
    title: "Share your story",
    description: "Tell us about the highlights, the guide, and memorable moments.",
  },
  {
    title: "Review & send",
    description: "Confirm your details before submitting.",
  },
];

const stepFields: Record<number, (keyof FeedbackFormValues)[]> = {
  0: ["tourId", "language"],
  1: ["rating"],
  2: ["name", "country", "message"],
  3: [],
};

function loadDraft(): Partial<FeedbackFormValues> | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Partial<FeedbackFormValues>;
  } catch (error) {
    console.warn("Failed to parse feedback draft", error);
    return null;
  }
}

function loadQuickIntent(): Partial<FeedbackFormValues> | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(QUICK_INTENT_KEY);
  if (!stored) return null;
  try {
    const intent = JSON.parse(stored) as { name?: string; message?: string };
    window.sessionStorage.removeItem(QUICK_INTENT_KEY);
    return {
      name: intent.name ?? "",
      message: intent.message ?? "",
    };
  } catch (error) {
    console.warn("Failed to parse quick feedback intent", error);
    return null;
  }
}

export default function FeedbackForm({ tours }: FeedbackFormProps) {
  const { toast } = useToast();
  const { isReady: isRecaptchaReady, execute, error: recaptchaError } = useRecaptchaEnterprise({
    action: "feedback_submit",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

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

  useEffect(() => {
    const defaults = { ...form.getValues() };
    const draft = loadDraft();
    const quickIntent = loadQuickIntent();
    const nextValues = { ...defaults, ...draft, ...quickIntent };
    form.reset(nextValues);
  }, [form]);

  const onSubmit = async (data: FeedbackFormValues) => {
    if (!isRecaptchaReady) {
      toast({
        title: "Spam protection not ready",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    let submissionToast: ReturnType<typeof toast> | undefined;
    try {
      setIsSubmitting(true);
      submissionToast = toast({
        title: "Submitting feedback...",
        description: "Please wait while we share your travel story.",
        duration: 60000,
      });
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

      window.localStorage.removeItem(STORAGE_KEY);
      setSubmitted(true);
      if (submissionToast) {
        submissionToast.update({
          id: submissionToast.id,
          title: "Feedback submitted",
          description: "Thank you for sharing your experience with us.",
          duration: 5000,
        });
      }
      form.reset({
        name: "",
        country: "",
        language: data.language,
        rating: 0,
        message: "",
        tourId: data.tourId ?? "",
        photo: undefined,
      });
      setCurrentStep(0);
    } catch (error) {
      console.error("Feedback submission error:", error);
      const description = error instanceof Error ? error.message : "An unexpected error occurred.";
      if (submissionToast) {
        submissionToast.update({
          id: submissionToast.id,
          title: "Submission failed",
          description,
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "Submission failed",
          description,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    const fields = stepFields[currentStep] ?? [];
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (!valid) return;
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleSaveDraft = () => {
    if (typeof window === "undefined") return;
    const values = form.getValues();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    toast({
      title: "Draft saved",
      description: "You can safely close this page and continue later.",
    });
  };

  const watchedValues = form.watch();

  if (submitted) {
    return (
      <div className="rounded-3xl border border-border/60 bg-background/80 p-8 text-center shadow-lg">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-4 text-2xl font-headline">Thank you for your feedback!</h2>
        <p className="mt-2 text-muted-foreground">
          We appreciate you taking the time to help us refine every adventure. Share your story with friends:
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Button asChild variant="outline">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(process.env.NEXT_PUBLIC_SITE_URL || 'https://tourfeedbackhub.com')}`}
              target="_blank"
              rel="noreferrer"
            >
              Share on Facebook
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('I just shared my travel story with Tour Feedback Hub!')}`}
              target="_blank"
              rel="noreferrer"
            >
              Share on X
            </a>
          </Button>
          <Button onClick={() => setSubmitted(false)}>Submit another</Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
        {recaptchaError && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {recaptchaError.message}
          </p>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
            <h2 className="mt-2 text-2xl font-headline">{steps[currentStep].title}</h2>
            <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSaveDraft}>
              <Save className="mr-2 h-4 w-4" /> Save draft
            </Button>
          </div>
        </div>

        <div className="grid gap-8 rounded-3xl border border-border/60 bg-background/80 p-8 shadow-sm">
          {currentStep === 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tourId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Which tour did you join?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tour" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">I don’t remember the code</SelectItem>
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
                    <FormLabel>Preferred language</FormLabel>
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
          )}

          {currentStep === 1 && (
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall rating</FormLabel>
                  <FormControl>
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-center">
                      <StarRating rating={field.value} setRating={(value) => field.onChange(value)} />
                      <p className="mt-3 text-sm text-muted-foreground">
                        How would you rate this journey from 1 (not great) to 5 (exceptional)?
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {currentStep === 2 && (
            <div className="grid gap-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your full name</FormLabel>
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
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your story</FormLabel>
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
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Here’s a quick summary before you send it:</p>
              <div className="grid gap-3 rounded-2xl border border-border/50 bg-muted/20 p-6">
                <div className="grid gap-1 md:grid-cols-2">
                  <span className="font-semibold text-foreground">Name:</span>
                  <span>{watchedValues.name || '—'}</span>
                </div>
                <div className="grid gap-1 md:grid-cols-2">
                  <span className="font-semibold text-foreground">Country:</span>
                  <span>{watchedValues.country || '—'}</span>
                </div>
                <div className="grid gap-1 md:grid-cols-2">
                  <span className="font-semibold text-foreground">Tour:</span>
                  <span>
                    {tourOptions.find((tour) => tour.id === watchedValues.tourId)?.name || 'Not specified'}
                  </span>
                </div>
                <div className="grid gap-1 md:grid-cols-2">
                  <span className="font-semibold text-foreground">Rating:</span>
                  <span>{watchedValues.rating ? `${watchedValues.rating} / 5` : 'No rating selected'}</span>
                </div>
                <div className="grid gap-1">
                  <span className="font-semibold text-foreground">Message:</span>
                  <p className="leading-relaxed">{watchedValues.message || '—'}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/80">
                Your information is private &amp; secure. We only share details that you approve for publishing.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="lg" disabled={isSubmitting || !isRecaptchaReady} aria-busy={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Submitting..." : "Submit feedback"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
