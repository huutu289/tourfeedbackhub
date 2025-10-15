'use client';

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase/provider";
import { doc, setDoc } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/firestore/use-memo-firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { requireAppCheckToken } from "@/lib/admin/app-check";
import { siteSettings as fallbackSettings } from "@/lib/data";
import type { SiteSettings } from "@/lib/types";

const contactSchema = z.object({
  email: z
    .string()
    .email("Must be a valid email")
    .or(z.literal(""))
    .optional(),
  phone: z.string().or(z.literal("")).optional(),
  whatsapp: z.string().or(z.literal("")).optional(),
  zalo: z.string().or(z.literal("")).optional(),
  facebook: z.string().or(z.literal("")).optional(),
  instagram: z.string().or(z.literal("")).optional(),
  location: z.string().or(z.literal("")).optional(),
});

const colorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Must be a valid hex colour (e.g. #123ABC)")
  .or(z.literal(""))
  .optional();

const siteSettingsSchema = z
  .object({
    heroTitle: z.string().min(1, "Hero title is required"),
    heroSubtitle: z.string().min(1, "Hero subtitle is required"),
    heroCtaLabel: z.string().min(1, "CTA label is required"),
    heroMediaUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
    aboutTitle: z.string().min(1, "About title is required"),
    aboutDescription: z.string().min(1, "About description is required"),
    missionStatement: z.string().or(z.literal("")).optional(),
    values: z.array(
      z.object({
        value: z.string().min(1, "Value cannot be empty"),
      })
    ),
    languages: z.array(
      z.object({
        value: z.string().min(1, "Language cannot be empty"),
      })
    ),
    defaultLanguage: z.string().min(1, "Default language is required"),
    primaryColor: colorSchema,
    accentColor: colorSchema,
    contact: contactSchema,
  })
  .superRefine((data, ctx) => {
    const languages = data.languages.map((item) => item.value.trim().toLowerCase());
    if (!languages.includes(data.defaultLanguage.trim().toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Default language must be one of the configured languages.",
        path: ["defaultLanguage"],
      });
    }
  });

type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;

function ensureArray(values?: string[]): { value: string }[] {
  if (!values || values.length === 0) {
    return [{ value: "" }];
  }
  return values.map((value) => ({ value }));
}

function mergeSettings(doc?: Partial<SiteSettings>): SiteSettings {
  return {
    heroTitle: doc?.heroTitle ?? fallbackSettings.heroTitle,
    heroSubtitle: doc?.heroSubtitle ?? fallbackSettings.heroSubtitle,
    heroCtaLabel: doc?.heroCtaLabel ?? fallbackSettings.heroCtaLabel,
    heroMediaUrl: doc?.heroMediaUrl ?? fallbackSettings.heroMediaUrl,
    aboutTitle: doc?.aboutTitle ?? fallbackSettings.aboutTitle,
    aboutDescription: doc?.aboutDescription ?? fallbackSettings.aboutDescription,
    missionStatement: doc?.missionStatement ?? fallbackSettings.missionStatement,
    values: Array.isArray(doc?.values) && doc?.values.length ? doc.values : fallbackSettings.values,
    contact: {
      ...fallbackSettings.contact,
      ...(doc?.contact ?? {}),
    },
    languages: Array.isArray(doc?.languages) && doc?.languages.length
      ? doc.languages
      : fallbackSettings.languages,
    defaultLanguage: doc?.defaultLanguage ?? fallbackSettings.defaultLanguage,
    primaryColor: doc?.primaryColor ?? fallbackSettings.primaryColor,
    accentColor: doc?.accentColor ?? fallbackSettings.accentColor,
  };
}

function toFormValues(settings: SiteSettings): SiteSettingsFormValues {
  return {
    heroTitle: settings.heroTitle,
    heroSubtitle: settings.heroSubtitle,
    heroCtaLabel: settings.heroCtaLabel,
    heroMediaUrl: settings.heroMediaUrl ?? "",
    aboutTitle: settings.aboutTitle,
    aboutDescription: settings.aboutDescription,
    missionStatement: settings.missionStatement ?? "",
    values: ensureArray(settings.values ?? []),
    languages: ensureArray(settings.languages ?? []),
    defaultLanguage: settings.defaultLanguage,
    primaryColor: settings.primaryColor ?? "",
    accentColor: settings.accentColor ?? "",
    contact: {
      email: settings.contact.email ?? "",
      phone: settings.contact.phone ?? "",
      whatsapp: settings.contact.whatsapp ?? "",
      zalo: settings.contact.zalo ?? "",
      facebook: settings.contact.facebook ?? "",
      instagram: settings.contact.instagram ?? "",
      location: settings.contact.location ?? "",
    },
  };
}

function cleanString(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function preparePayload(values: SiteSettingsFormValues): SiteSettings {
  const formattedValues = values.values
    .map((item) => item.value.trim())
    .filter(Boolean);

  const formattedLanguages = values.languages
    .map((item) => item.value.trim())
    .filter(Boolean);

  return {
    heroTitle: values.heroTitle.trim(),
    heroSubtitle: values.heroSubtitle.trim(),
    heroCtaLabel: values.heroCtaLabel.trim(),
    heroMediaUrl: cleanString(values.heroMediaUrl),
    aboutTitle: values.aboutTitle.trim(),
    aboutDescription: values.aboutDescription.trim(),
    missionStatement: cleanString(values.missionStatement),
    values: formattedValues,
    contact: {
      email: cleanString(values.contact.email),
      phone: cleanString(values.contact.phone),
      whatsapp: cleanString(values.contact.whatsapp),
      zalo: cleanString(values.contact.zalo),
      facebook: cleanString(values.contact.facebook),
      instagram: cleanString(values.contact.instagram),
      location: cleanString(values.contact.location),
    },
    languages: formattedLanguages,
    defaultLanguage: values.defaultLanguage.trim(),
    primaryColor: cleanString(values.primaryColor),
    accentColor: cleanString(values.accentColor),
  };
}

export default function SiteContentPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const settingsRef = useMemoFirebase(
    () => doc(firestore, "siteSettings", "public"),
    [firestore]
  );

  const { data, isLoading } = useDoc<Partial<SiteSettings>>(settingsRef);

  const initialSettings = useMemo(
    () => mergeSettings(data ?? undefined),
    [data]
  );

  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: toFormValues(initialSettings),
  });

  const valuesArray = useFieldArray({
    control: form.control,
    name: "values",
  });

  const languagesArray = useFieldArray({
    control: form.control,
    name: "languages",
  });

  useEffect(() => {
    form.reset(toFormValues(initialSettings));
  }, [initialSettings, form]);

  const onSubmit = async (values: SiteSettingsFormValues) => {
    setIsSaving(true);
    try {
      await requireAppCheckToken();
      const payload = preparePayload(values);
      await setDoc(settingsRef, payload, { merge: true });
      toast({
        title: "Site content updated",
        description: "Visitors will see the latest About and contact information.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save site settings.";
      toast({
        variant: "destructive",
        title: "Save failed",
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Site Content</h1>
        <p className="text-muted-foreground">
          Manage the About page narrative, hero content, and contact channels displayed on the site.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading current settings…</span>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hero Section</CardTitle>
                <CardDescription>
                  Update the headline and hero media displayed across the site.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="heroTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hero Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="heroSubtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hero Subtitle</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="heroCtaLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary CTA Label</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="heroMediaUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hero Media URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About Section</CardTitle>
                <CardDescription>
                  Control the narrative and highlights shared on the About page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="aboutTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aboutDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About Description</FormLabel>
                      <FormControl>
                        <Textarea rows={5} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="missionStatement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mission Statement</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Core Values</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => valuesArray.append({ value: "" })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Value
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {valuesArray.fields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-3">
                        <FormField
                          control={form.control}
                          name={`values.${index}.value`}
                          render={({ field: valueField }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="sr-only">
                                Value {index + 1}
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="Enter a value travellers care about" {...valueField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => valuesArray.remove(index)}
                          disabled={valuesArray.fields.length === 1}
                          aria-label="Remove value"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Languages & Branding</CardTitle>
                <CardDescription>
                  Configure supported languages and brand colours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Supported Languages</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => languagesArray.append({ value: "" })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Language
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {languagesArray.fields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-3">
                        <FormField
                          control={form.control}
                          name={`languages.${index}.value`}
                          render={({ field: langField }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="sr-only">
                                Language {index + 1}
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. en, fr, vi" {...langField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => languagesArray.remove(index)}
                          disabled={languagesArray.fields.length === 1}
                          aria-label="Remove language"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="defaultLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Language</FormLabel>
                      <FormControl>
                        <Input placeholder="en" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Colour</FormLabel>
                        <FormControl>
                          <Input placeholder="#123ABC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accentColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accent Colour</FormLabel>
                        <FormControl>
                          <Input placeholder="#456DEF" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Channels</CardTitle>
                <CardDescription>
                  These details appear on the Contact page and the global footer.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="hello@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+84 123 456 789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact.whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://wa.me/…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact.zalo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zalo Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://zalo.me/…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact.facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <Input placeholder="https://facebook.com/…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact.instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="https://instagram.com/…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact.location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Da Nang, Vietnam" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset(toFormValues(initialSettings))}
                disabled={isSaving}
              >
                Reset changes
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save updates
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
