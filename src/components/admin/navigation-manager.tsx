'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  GripVertical,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase/provider';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { useCollection, type WithId } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { requireAppCheckToken } from '@/lib/admin/app-check';
import type {
  NavigationArea,
  NavigationAudience,
  NavigationItemType,
  NavigationMenuKey,
} from '@/lib/types';

const DEFAULT_LOCALES = ['en', 'vi'];
const DEFAULT_ORDER_GAP = 10;
const AUDIENCE_OPTIONS = ['guest', 'user', 'admin'] as const;
const AREA_OPTIONS = ['links', 'legal', 'social', 'contact', 'cta'] as const;
const TYPE_OPTIONS = ['internal', 'external', 'hash'] as const;
const TARGET_OPTIONS = ['_self', '_blank'] as const;
const ROOT_PARENT_VALUE = '__root__';

const BASE_LINK_OPTIONS: ComboboxOption[] = [
  { value: '/', label: 'Home', keywords: ['root', 'landing'] },
  { value: '/tours', label: 'Tours' },
  { value: '/stories', label: 'Stories' },
  { value: '/reviews', label: 'Reviews' },
  { value: '/finished-tours', label: 'Diaries' },
  { value: '/blog', label: 'Posts', keywords: ['blog', 'articles'] },
  { value: '/blog/categories', label: 'Categories', keywords: ['blog', 'topics'] },
  { value: '/about', label: 'About' },
  { value: '/contact', label: 'Contact' },
  { value: '/feedback', label: 'Feedback' },
  { value: '/reviews/new', label: 'Submit Review', hint: 'CTA form' },
];

const FOOTER_LINK_OPTIONS: ComboboxOption[] = [
  { value: '/privacy', label: 'Privacy Policy', keywords: ['legal'] },
  { value: '/terms', label: 'Terms of Service', keywords: ['legal'] },
  { value: '/contact#map', label: 'Contact Map', hint: 'Anchor' },
  { value: 'mailto:hello@example.com', label: 'Email', hint: 'mailto:' },
  { value: 'tel:+84908123456', label: 'Phone', hint: 'tel:' },
];

function buildLinkOptions(variant: NavigationMenuKey): ComboboxOption[] {
  const options = [...BASE_LINK_OPTIONS];
  if (variant === 'footer') {
    FOOTER_LINK_OPTIONS.forEach((option) => {
      if (!options.find((existing) => existing.value === option.value)) {
        options.push(option);
      }
    });
  }
  return options;
}

function createDuplicateLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed.length) return 'Untitled (Copy)';
  if (/(\(copy\))$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} (Copy)`;
}

interface NavigationManagerProps {
  variant: NavigationMenuKey;
  locales?: string[];
}

interface NavigationMenuRecord {
  id: string;
  key: NavigationMenuKey;
  locale?: string | null;
  title?: string;
  published?: boolean;
  updatedAt?: unknown;
}

interface NavigationMenuItemRecord {
  label?: string;
  href?: string;
  type?: string;
  order?: number;
  parentId?: string | null;
  icon?: string;
  target?: string;
  visibleFor?: string[];
  badge?: { text?: string; color?: string };
  area?: string;
  group?: string;
}

interface DraftNavigationItem {
  id: string;
  label: string;
  href: string;
  type: NavigationItemType;
  order: number;
  parentId: string | null;
  icon?: string;
  target: '_self' | '_blank';
  visibleFor?: NavigationAudience[];
  badge?: { text: string; color?: string };
  area?: NavigationArea;
  group?: string;
}

interface NavigationTreeNode extends DraftNavigationItem {
  children: NavigationTreeNode[];
}

interface ItemFormValues {
  label: string;
  href: string;
  type: NavigationItemType;
  order: number;
  parentId: string | null;
  icon?: string;
  target: '_self' | '_blank';
  group?: string;
  area?: NavigationArea;
  visibleFor?: NavigationAudience[];
  badgeText?: string;
  badgeColor?: string;
}

interface ParentOption {
  value: string;
  label: string;
}

function normaliseLocale(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'default';
  }
  return value;
}

function denormaliseLocale(value: string): string | null {
  if (value === 'default') {
    return null;
  }
  return value;
}

function mapMenuItem(doc: WithId<NavigationMenuItemRecord>): DraftNavigationItem {
  const orderRaw = doc.order ?? 0;
  const orderValue =
    typeof orderRaw === 'number' && Number.isFinite(orderRaw)
      ? orderRaw
      : Number(orderRaw) || 0;

  const parentId =
    typeof doc.parentId === 'string' && doc.parentId.trim()
      ? doc.parentId.trim()
      : null;

  const visibleFor = Array.isArray(doc.visibleFor)
    ? (doc.visibleFor.filter((entry): entry is NavigationAudience =>
        AUDIENCE_OPTIONS.includes(entry as NavigationAudience)
      ) as NavigationAudience[])
    : undefined;

  const badge =
    doc.badge && typeof doc.badge === 'object' && doc.badge.text
      ? {
          text: String(doc.badge.text),
          color:
            typeof doc.badge.color === 'string' && doc.badge.color.trim()
              ? doc.badge.color.trim()
              : undefined,
        }
      : undefined;

  const area =
    typeof doc.area === 'string' && AREA_OPTIONS.includes(doc.area as NavigationArea)
      ? (doc.area as NavigationArea)
      : undefined;

  const type =
    typeof doc.type === 'string' && TYPE_OPTIONS.includes(doc.type as NavigationItemType)
      ? (doc.type as NavigationItemType)
      : 'internal';

  const target =
    doc.target === '_blank' || doc.target === '_self' ? doc.target : '_self';

  return {
    id: doc.id,
    label: doc.label && doc.label.trim().length ? doc.label : doc.id,
    href: doc.href && doc.href.trim().length ? doc.href : '#',
    type,
    order: orderValue,
    parentId,
    icon: doc.icon && doc.icon.trim().length ? doc.icon.trim() : undefined,
    target,
    visibleFor,
    badge,
    area,
    group: doc.group && doc.group.trim().length ? doc.group.trim() : undefined,
  };
}

function cloneItems(items: DraftNavigationItem[]): DraftNavigationItem[] {
  return items.map((item) => ({
    ...item,
    visibleFor: item.visibleFor ? [...item.visibleFor] : undefined,
    badge: item.badge ? { ...item.badge } : undefined,
  }));
}

function isDescendant(
  items: DraftNavigationItem[],
  potentialParentId: string | null,
  nodeId: string
): boolean {
  if (!potentialParentId) return false;
  if (potentialParentId === nodeId) return true;
  const parent = items.find((item) => item.id === potentialParentId);
  if (!parent) return false;
  return isDescendant(items, parent.parentId, nodeId);
}

function recalcOrder(items: DraftNavigationItem[], parentId: string | null): void {
  const siblings = items
    .filter((item) => (item.parentId ?? null) === parentId)
    .sort((a, b) => {
      if (a.order === b.order) {
        return a.label.localeCompare(b.label);
      }
      return a.order - b.order;
    });

  siblings.forEach((sibling, index) => {
    sibling.order = (index + 1) * DEFAULT_ORDER_GAP;
  });
  siblings.forEach((sibling) => {
    recalcOrder(items, sibling.id);
  });
}

function moveItem(
  sourceItems: DraftNavigationItem[],
  draggedId: string,
  targetParentId: string | null,
  position: number
): DraftNavigationItem[] {
  if (!draggedId) return sourceItems;
  const items = cloneItems(sourceItems);
  const dragged = items.find((item) => item.id === draggedId);
  if (!dragged) return sourceItems;
  if (targetParentId === dragged.id) return sourceItems;
  if (isDescendant(items, targetParentId, dragged.id)) return sourceItems;

  const newParentId = targetParentId;
  const oldParentId = dragged.parentId;
  dragged.parentId = newParentId;

  const targetSiblings = items
    .filter((item) => item.id !== dragged.id && (item.parentId ?? null) === newParentId)
    .sort((a, b) => {
      if (a.order === b.order) {
        return a.label.localeCompare(b.label);
      }
      return a.order - b.order;
    });

  const insertionIndex = Math.min(Math.max(position, 0), targetSiblings.length);
  targetSiblings.splice(insertionIndex, 0, dragged);

  recalcOrder(items, newParentId);

  if (oldParentId !== newParentId) {
    recalcOrder(items, oldParentId ?? null);
  }

  return items;
}

function buildTree(items: DraftNavigationItem[]): NavigationTreeNode[] {
  const nodes = items.map<NavigationTreeNode>((item) => ({
    ...item,
    children: [],
  }));
  const byId = new Map<string, NavigationTreeNode>();
  nodes.forEach((node) => byId.set(node.id, node));

  const roots: NavigationTreeNode[] = [];
  nodes.forEach((node) => {
    if (node.parentId) {
      const parent = byId.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (list: NavigationTreeNode[]) => {
    list.sort((a, b) => {
      if (a.order === b.order) {
        return a.label.localeCompare(b.label);
      }
      return a.order - b.order;
    });
    list.forEach((child) => sortChildren(child.children));
  };

  sortChildren(roots);
  return roots;
}

function computeSignature(items: DraftNavigationItem[]): string {
  const payload = items
    .map((item) => ({
      id: item.id,
      parentId: item.parentId ?? null,
      order: item.order,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(payload);
}

function collectDescendantIds(items: DraftNavigationItem[], rootId: string): Set<string> {
  const result = new Set<string>();
  const visit = (id: string) => {
    items
      .filter((item) => item.parentId === id)
      .forEach((child) => {
        result.add(child.id);
        visit(child.id);
      });
  };
  visit(rootId);
  return result;
}

function buildParentOptions(
  items: DraftNavigationItem[],
  exclude: Set<string> = new Set()
): ParentOption[] {
  const tree = buildTree(items);
  const options: ParentOption[] = [];

  const visit = (nodes: NavigationTreeNode[], depth: number) => {
    nodes.forEach((node) => {
      if (!exclude.has(node.id)) {
        options.push({
          value: node.id,
          label: `${'— '.repeat(depth)}${node.label}`,
        });
        visit(node.children, depth + 1);
      }
    });
  };

  visit(tree, 0);
  return options;
}

function buildItemSchema(variant: NavigationMenuKey): z.ZodType<ItemFormValues> {
  const schema = z
    .object({
      label: z.string().min(1, 'Label is required'),
      href: z.string().min(1, 'Link is required'),
      type: z.enum(TYPE_OPTIONS),
      order: z.coerce.number().min(0, 'Order must be zero or higher'),
      parentId: z.string().nullable().optional(),
      icon: z.string().optional(),
      target: z.enum(TARGET_OPTIONS),
      group: z.string().optional(),
      area: z.enum(AREA_OPTIONS).optional(),
      visibleFor: z.array(z.enum(AUDIENCE_OPTIONS)).optional(),
      badgeText: z.string().optional(),
      badgeColor: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      if (variant === 'footer' && !value.area) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Area is required for footer items',
          path: ['area'],
        });
      }

      if (variant === 'header' && value.badgeColor && !value.badgeText) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Badge text is required when a badge colour is set',
          path: ['badgeText'],
        });
      }
    });

  return schema as unknown as z.ZodType<ItemFormValues>;
}

function DropMarker({
  onDrop,
  indent,
}: {
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  indent: number;
}) {
  const [isActive, setIsActive] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="w-full py-1"
      style={{ paddingLeft: indent * 24 }}
    >
      <div
        className={cn(
          'h-2 w-full rounded border border-dashed border-transparent transition-colors',
          isActive ? 'border-primary bg-primary/30' : 'hover:border-border'
        )}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsActive(false);
          onDrop(event);
        }}
      />
    </div>
  );
}

interface TreeItemRowProps {
  item: NavigationTreeNode;
  depth: number;
  variant: NavigationMenuKey;
  draggedId: string | null;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd: () => void;
  onDropInto: (event: React.DragEvent<HTMLDivElement>, id: string) => void;
  onEdit: (item: DraftNavigationItem) => void;
  onDelete: (item: DraftNavigationItem) => void;
  onDuplicate: (item: DraftNavigationItem) => void;
  onRowClick: (item: DraftNavigationItem) => void;
  duplicatingId: string | null;
}

function TreeItemRow({
  item,
  depth,
  variant,
  draggedId,
  onDragStart,
  onDragEnd,
  onDropInto,
  onEdit,
  onDelete,
  onDuplicate,
  onRowClick,
  duplicatingId,
}: TreeItemRowProps) {
  const isDragging = draggedId === item.id;
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, item.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={(event) => onDropInto(event, item.id)}
      className={cn(
        'mb-1 w-full rounded border bg-card px-4 py-3 shadow-sm transition hover:border-primary',
        isDragging && 'border-primary/50 opacity-70'
      )}
      style={{ marginLeft: depth * 24 }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('button')) {
          return;
        }
        onRowClick(item);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onRowClick(item);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{item.label}</span>
            <Badge variant="outline">#{item.order}</Badge>
            <Badge variant="outline">{item.type}</Badge>
            {item.target === '_blank' ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                New tab
              </Badge>
            ) : null}
            {variant === 'footer' && item.area ? (
              <Badge variant="secondary">{item.area}</Badge>
            ) : null}
            {item.visibleFor && item.visibleFor.length ? (
              <Badge variant="secondary">
                {item.visibleFor.join(', ')}
              </Badge>
            ) : null}
            {item.group ? (
              <Badge variant="outline">Group: {item.group}</Badge>
            ) : null}
            {item.badge ? (
              <Badge
                className={cn(
                  'border-none',
                  item.badge.color ? '' : 'bg-primary text-primary-foreground'
                )}
                style={
                  item.badge.color
                    ? {
                        backgroundColor: item.badge.color,
                        borderColor: item.badge.color,
                      }
                    : undefined
                }
              >
                {item.badge.text}
              </Badge>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">{item.href}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDuplicate(item)}
            disabled={duplicatingId === item.id}
          >
            {duplicatingId === item.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">Duplicate {item.label}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit {item.label}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete {item.label}</span>
          </Button>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

interface ItemDialogProps {
  open: boolean;
  variant: NavigationMenuKey;
  parentOptions: ParentOption[];
  initialValues: ItemFormValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ItemFormValues) => Promise<void>;
  isSubmitting: boolean;
}

function ItemDialog({
  open,
  variant,
  parentOptions,
  initialValues,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: ItemDialogProps) {
  const schema = useMemo(() => buildItemSchema(variant), [variant]);
  const linkOptions = useMemo(() => buildLinkOptions(variant), [variant]);
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialValues.label ? 'Edit item' : 'Add item'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="Tours" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="href"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link</FormLabel>
                  <FormControl>
                    <Combobox
                      options={linkOptions}
                      value={field.value || undefined}
                      onChange={(value) => field.onChange(value ?? '')}
                      placeholder="Select or type a link"
                      searchPlaceholder="Search links…"
                      allowClear
                      clearLabel="Clear link"
                      allowCreate
                      createLabel={(query) => `Use "${query}"`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TARGET_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option === '_blank' ? 'New tab' : 'Same tab'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent</FormLabel>
                    <Select
                      value={field.value ?? ROOT_PARENT_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === ROOT_PARENT_VALUE ? null : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Top level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ROOT_PARENT_VALUE}>Top level</SelectItem>
                        {parentOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Map" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Experiences" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {variant === 'footer' ? (
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Footer area</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AREA_OPTIONS.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            {variant === 'header' ? (
              <div className="space-y-4">
                <div>
                  <FormLabel>Visible for</FormLabel>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {AUDIENCE_OPTIONS.map((audience) => (
                      <FormField
                        key={audience}
                        control={form.control}
                        name="visibleFor"
                        render={({ field }) => {
                          const value = field.value ?? [];
                          return (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={value.includes(audience)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...value, audience]);
                                    } else {
                                      field.onChange(value.filter((item) => item !== audience));
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">{audience}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="badgeText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Badge text</FormLabel>
                        <FormControl>
                          <Input placeholder="New" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="badgeColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Badge colour</FormLabel>
                        <FormControl>
                          <Input placeholder="#2563eb" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {initialValues.label ? 'Save changes' : 'Add item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface LocaleMenuEditorProps {
  menu: WithId<NavigationMenuRecord>;
  variant: NavigationMenuKey;
  locale: string;
}

function LocaleMenuEditor({ menu, variant, locale }: LocaleMenuEditorProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [draftItems, setDraftItems] = useState<DraftNavigationItem[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isUpdatingMenu, setIsUpdatingMenu] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DraftNavigationItem | null>(null);
  const [editingItem, setEditingItem] = useState<DraftNavigationItem | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const itemsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, `navigationMenus/${menu.id}/items`),
        orderBy('order', 'asc')
      ),
    [firestore, menu.id]
  );

  const { data: itemDocs, isLoading: isLoadingItems } =
    useCollection<NavigationMenuItemRecord>(itemsQuery);

  const mappedItems = useMemo(
    () => (itemDocs ? itemDocs.map(mapMenuItem) : []),
    [itemDocs]
  );

  useEffect(() => {
    setDraftItems(mappedItems);
  }, [mappedItems, menu.id]);

  const remoteSignature = useMemo(() => computeSignature(mappedItems), [mappedItems]);
  const draftSignature = useMemo(() => computeSignature(draftItems), [draftItems]);
  const hasPendingOrderChanges = remoteSignature !== draftSignature;

  const parentOptions = useMemo(() => {
    if (!editingItem) {
      return buildParentOptions(draftItems);
    }
    const excluded = collectDescendantIds(draftItems, editingItem.id);
    excluded.add(editingItem.id);
    return buildParentOptions(draftItems, excluded);
  }, [draftItems, editingItem]);

  const nextOrder = useMemo(() => {
    if (!draftItems.length) return DEFAULT_ORDER_GAP;
    return Math.max(...draftItems.map((item) => item.order)) + DEFAULT_ORDER_GAP;
  }, [draftItems]);

  const tree = useMemo(() => buildTree(draftItems), [draftItems]);

  const getNextOrderForParent = useCallback(
    (parentId: string | null) => {
      const siblings = draftItems.filter((entry) => (entry.parentId ?? null) === parentId);
      if (!siblings.length) {
        return DEFAULT_ORDER_GAP;
      }
      return Math.max(...siblings.map((entry) => entry.order)) + DEFAULT_ORDER_GAP;
    },
    [draftItems]
  );

  const handleDuplicateItem = useCallback(
    async (target: DraftNavigationItem) => {
      setDuplicatingId(target.id);
      try {
        await requireAppCheckToken();

        const descendantIds = collectDescendantIds(draftItems, target.id);
        const branchItems = draftItems.filter(
          (entry) => entry.id === target.id || descendantIds.has(entry.id)
        );

        if (!branchItems.length) {
          toast({
            title: 'No item to duplicate',
            description: 'The selected navigation item could not be found.',
            variant: 'destructive',
          });
          return;
        }

        const itemsCollection = collection(
          firestore,
          `navigationMenus/${menu.id}/items`
        );
        const idMap = new Map<string, string>();

        branchItems.forEach((entry) => {
          const newDocRef = doc(itemsCollection);
          idMap.set(entry.id, newDocRef.id);
        });

        const batch = writeBatch(firestore);
        const newRootOrder = getNextOrderForParent(target.parentId ?? null);

        branchItems.forEach((original) => {
          const newId = idMap.get(original.id);
          if (!newId) return;
          const isRoot = original.id === target.id;
          const mappedParent = original.parentId
            ? idMap.get(original.parentId) ?? original.parentId
            : null;
          const payload: Record<string, unknown> = {
            label: isRoot ? createDuplicateLabel(original.label) : original.label,
            href: original.href,
            type: original.type,
            order: isRoot ? newRootOrder : original.order,
            parentId: mappedParent,
            icon: original.icon ?? null,
            target: original.target ?? '_self',
            group: original.group ?? null,
            updatedAt: serverTimestamp(),
          };

          if (variant === 'footer') {
            payload.area = original.area ?? null;
          } else {
            payload.area = original.area ?? null;
          }

          payload.visibleFor =
            original.visibleFor && original.visibleFor.length ? original.visibleFor : null;
          payload.badge = original.badge
            ? {
                text: original.badge.text,
                color: original.badge.color ?? null,
              }
            : null;

          batch.set(doc(firestore, `navigationMenus/${menu.id}/items`, newId), payload);
        });

        batch.update(doc(firestore, 'navigationMenus', menu.id), {
          updatedAt: serverTimestamp(),
        });

        await batch.commit();

        setDraftItems((prev) => {
          const clones = branchItems.map((original) => {
            const newId = idMap.get(original.id);
            if (!newId) return null;
            const isRoot = original.id === target.id;
            return {
              ...original,
              id: newId,
              parentId: original.parentId
                ? idMap.get(original.parentId) ?? original.parentId
                : null,
              order: isRoot ? newRootOrder : original.order,
              label: isRoot ? createDuplicateLabel(original.label) : original.label,
            };
          });

          return [...prev, ...clones.filter((entry): entry is DraftNavigationItem => entry !== null)];
        });

        toast({
          title: 'Navigation duplicated',
          description: `"${target.label}" copied successfully.`,
        });
      } catch (error) {
        toast({
          title: 'Failed to duplicate item',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setDuplicatingId(null);
      }
    },
    [draftItems, firestore, getNextOrderForParent, menu.id, toast, variant]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, parentId: string | null, index: number) => {
      const dragged = event.dataTransfer.getData('text/plain');
      if (!dragged) return;
      setDraftItems((prev) => moveItem(prev, dragged, parentId, index));
    },
    []
  );

  const handleDropInto = useCallback((event: React.DragEvent<HTMLDivElement>, parentId: string) => {
    const dragged = event.dataTransfer.getData('text/plain');
    if (!dragged) return;
    setDraftItems((prev) => {
      const siblingCount = prev.filter((item) => item.parentId === parentId).length;
      return moveItem(prev, dragged, parentId, siblingCount);
    });
  }, []);

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, id: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  const resetOrder = useCallback(() => {
    setDraftItems(mappedItems);
  }, [mappedItems]);

  const handleSaveOrder = useCallback(async () => {
    if (!hasPendingOrderChanges) return;
    setIsSavingOrder(true);
    try {
      await requireAppCheckToken();
      const batch = writeBatch(firestore);
      draftItems.forEach((item) => {
        const itemRef = doc(firestore, `navigationMenus/${menu.id}/items`, item.id);
        batch.set(
          itemRef,
          {
            order: item.order,
            parentId: item.parentId ?? null,
          },
          { merge: true }
        );
      });
      batch.update(doc(firestore, 'navigationMenus', menu.id), {
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      toast({
        title: 'Menu updated',
        description: 'Navigation order saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Failed to save order',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSavingOrder(false);
    }
  }, [draftItems, firestore, hasPendingOrderChanges, menu.id, toast]);

  const handleTogglePublish = useCallback(
    async (published: boolean) => {
      setIsUpdatingMenu(true);
      try {
        await requireAppCheckToken();
        await updateDoc(doc(firestore, 'navigationMenus', menu.id), {
          published,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: published ? 'Menu published' : 'Menu unpublished',
          description: `Visitors will ${published ? 'see' : 'not see'} ${locale.toUpperCase()} navigation items.`,
        });
      } catch (error) {
        toast({
          title: 'Failed to update menu',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setIsUpdatingMenu(false);
      }
    },
    [firestore, locale, menu.id, toast]
  );

  const handleSubmitItem = useCallback(
    async (values: ItemFormValues) => {
      setItemSubmitting(true);
      try {
        await requireAppCheckToken();
        const itemId = editingItem?.id ?? doc(collection(firestore, `navigationMenus/${menu.id}/items`)).id;
        const itemRef = doc(firestore, `navigationMenus/${menu.id}/items`, itemId);
        const payload: Record<string, unknown> = {
          label: values.label.trim(),
          href: values.href.trim(),
          type: values.type,
          order: Math.round(values.order),
          parentId: values.parentId ?? null,
          icon: values.icon?.trim() || null,
          target: values.target,
          group: values.group?.trim() || null,
          updatedAt: serverTimestamp(),
        };

        if (variant === 'footer') {
          payload.area = values.area;
        } else {
          payload.area = values.area ?? null;
        }

        if (variant === 'header') {
          payload.visibleFor =
            values.visibleFor && values.visibleFor.length ? values.visibleFor : null;
          payload.badge =
            values.badgeText && values.badgeText.trim().length
              ? {
                  text: values.badgeText.trim(),
                  color: values.badgeColor && values.badgeColor.trim().length
                    ? values.badgeColor.trim()
                    : null,
                }
              : null;
        } else {
          payload.visibleFor = values.visibleFor ?? null;
          payload.badge = null;
        }

        await setDoc(itemRef, payload, { merge: true });
        await updateDoc(doc(firestore, 'navigationMenus', menu.id), {
          updatedAt: serverTimestamp(),
        });
        toast({
          title: editingItem ? 'Item updated' : 'Item added',
          description: `${values.label} saved successfully.`,
        });
        setEditingItem(null);
      } catch (error) {
        toast({
          title: 'Failed to save item',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setItemSubmitting(false);
      }
    },
    [editingItem, firestore, menu.id, toast, variant]
  );

  const handleDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;
    try {
      await requireAppCheckToken();
      const affectedIds = [itemToDelete.id, ...Array.from(collectDescendantIds(draftItems, itemToDelete.id))];
      const batch = writeBatch(firestore);
      affectedIds.forEach((id) => {
        batch.delete(doc(firestore, `navigationMenus/${menu.id}/items`, id));
      });
      batch.update(doc(firestore, 'navigationMenus', menu.id), {
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      toast({
        title: 'Item deleted',
        description: `"${itemToDelete.label}" and its children were removed.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to delete item',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setItemToDelete(null);
    }
  }, [draftItems, firestore, itemToDelete, menu.id, toast]);

  const renderTree = useCallback(
    (nodes: NavigationTreeNode[], parentId: string | null, depth: number) => {
      return (
        <>
          {nodes.map((node, index) => (
            <div key={`${node.id}-${node.order}-${node.parentId ?? 'root'}-${index}`}>
              <DropMarker
                indent={depth}
                onDrop={(event) => handleDrop(event, parentId, index)}
              />
              <TreeItemRow
                item={node}
                depth={depth}
                variant={variant}
                draggedId={draggedId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDropInto={(event, id) => handleDropInto(event, id)}
                onEdit={(item) => {
                  setEditingItem(item);
                  setIsItemDialogOpen(true);
                }}
                onDelete={(item) => setItemToDelete(item)}
                onDuplicate={(item) => handleDuplicateItem(item)}
                onRowClick={(item) => {
                  setEditingItem(item);
                  setIsItemDialogOpen(true);
                }}
                duplicatingId={duplicatingId}
              />
              {node.children.length ? (
                <div className="ml-6">
                  {renderTree(node.children, node.id, depth + 1)}
                </div>
              ) : null}
            </div>
          ))}
          <DropMarker
            indent={depth}
            onDrop={(event) => handleDrop(event, parentId, nodes.length)}
          />
        </>
      );
    },
    [
      draggedId,
      handleDragEnd,
      handleDragStart,
      handleDrop,
      handleDropInto,
      handleDuplicateItem,
      duplicatingId,
      variant,
    ]
  );

  const initialFormValues: ItemFormValues = useMemo(() => {
    if (editingItem) {
      return {
        label: editingItem.label,
        href: editingItem.href,
        type: editingItem.type,
        order: editingItem.order,
        parentId: editingItem.parentId,
        icon: editingItem.icon ?? '',
        target: editingItem.target,
        group: editingItem.group ?? '',
        area: editingItem.area ?? (variant === 'footer' ? AREA_OPTIONS[0] : undefined),
        visibleFor: editingItem.visibleFor ?? [],
        badgeText: editingItem.badge?.text ?? '',
        badgeColor: editingItem.badge?.color ?? '',
      };
    }
    return {
      label: '',
      href: '',
      type: 'internal',
      order: nextOrder,
      parentId: null,
      icon: '',
      target: '_self',
      group: '',
      area: variant === 'footer' ? 'links' : undefined,
      visibleFor: [],
      badgeText: '',
      badgeColor: '',
    };
  }, [editingItem, nextOrder, variant]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{(menu.title ?? '').trim() || `${variant === 'header' ? 'Header' : 'Footer'} – ${locale.toUpperCase()}`}</CardTitle>
          <CardDescription>
            Manage navigation items for <span className="font-medium">{locale.toUpperCase()}</span>
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={!!menu.published}
              onCheckedChange={handleTogglePublish}
              disabled={isUpdatingMenu}
              id={`publish-${menu.id}`}
            />
            <label htmlFor={`publish-${menu.id}`} className="text-sm text-muted-foreground">
              {menu.published ? 'Published' : 'Draft'}
            </label>
          </div>
          <Button
            onClick={() => {
              setEditingItem(null);
              setIsItemDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingItems ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading navigation items…
          </div>
        ) : draftItems.length === 0 ? (
          <div className="rounded border border-dashed bg-muted/40 p-8 text-center text-muted-foreground">
            No navigation items yet. Add your first link to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {renderTree(tree, null, 0)}
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="default"
            onClick={handleSaveOrder}
            disabled={!hasPendingOrderChanges || isSavingOrder}
          >
            {isSavingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save order
          </Button>
          <Button
            variant="outline"
            onClick={resetOrder}
            disabled={!hasPendingOrderChanges || isSavingOrder}
          >
            Reset changes
          </Button>
          <span className="text-sm text-muted-foreground">
            Drag & drop items to restructure the menu. Drop on another item to nest it.
          </span>
        </div>
      </CardContent>
      <ItemDialog
        open={isItemDialogOpen}
        onOpenChange={(open) => {
          setIsItemDialogOpen(open);
          if (!open) {
            setEditingItem(null);
          }
        }}
        variant={variant}
        parentOptions={parentOptions}
        initialValues={initialFormValues}
        onSubmit={handleSubmitItem}
        isSubmitting={itemSubmitting}
      />
      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete navigation item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{itemToDelete?.label}&quot;? Any nested items will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function NavigationManager({
  variant,
  locales = DEFAULT_LOCALES,
}: NavigationManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedLocale, setSelectedLocale] = useState(() => normaliseLocale(locales[0] ?? 'en'));

  const menusQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, 'navigationMenus'),
        where('key', '==', variant)
      ),
    [firestore, variant]
  );

  const { data: menus, isLoading: isLoadingMenus } = useCollection<NavigationMenuRecord>(menusQuery);

  const availableLocales = useMemo(() => {
    const set = new Set<string>(locales.map(normaliseLocale));
    (menus ?? []).forEach((menu) => {
      set.add(normaliseLocale(menu.locale ?? null));
    });
    return Array.from(set);
  }, [locales, menus]);

  useEffect(() => {
    if (!availableLocales.includes(selectedLocale) && availableLocales.length) {
      setSelectedLocale(availableLocales[0]);
    }
  }, [availableLocales, selectedLocale]);

  const menusByLocale = useMemo(() => {
    const map = new Map<string, WithId<NavigationMenuRecord>>();
    (menus ?? []).forEach((menu) => {
      map.set(normaliseLocale(menu.locale ?? null), menu);
    });
    return map;
  }, [menus]);

  const handleCreateMenu = useCallback(
    async (locale: string) => {
      try {
        await requireAppCheckToken();
        const menuId = `${variant}-${locale}`;
        await setDoc(doc(firestore, 'navigationMenus', menuId), {
          key: variant,
          locale: denormaliseLocale(locale),
          title:
            variant === 'header'
              ? `Header ${locale.toUpperCase()}`
              : `Footer ${locale.toUpperCase()}`,
          published: false,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Menu created',
          description: `You can now configure the ${locale.toUpperCase()} ${variant} menu.`,
        });
      } catch (error) {
        toast({
          title: 'Failed to create menu',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    },
    [firestore, toast, variant]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{variant === 'header' ? 'Header navigation' : 'Footer navigation'}</CardTitle>
          <CardDescription>
            Manage locale-specific navigation menus. Items publish instantly once you save changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMenus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading menus…
            </div>
          ) : (
            <Tabs value={selectedLocale} onValueChange={setSelectedLocale}>
              <TabsList className="flex-wrap">
                {availableLocales.map((locale) => (
                  <TabsTrigger key={locale} value={locale}>
                    {locale.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
              {availableLocales.map((locale) => {
                const menu = menusByLocale.get(locale);
                return (
                  <TabsContent key={locale} value={locale} className="mt-6 space-y-6">
                    {menu ? (
                      <LocaleMenuEditor menu={menu} variant={variant} locale={locale} />
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle>Create menu</CardTitle>
                          <CardDescription>
                            No menu exists for <span className="font-semibold">{locale.toUpperCase()}</span>.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button onClick={() => handleCreateMenu(locale)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create {variant} menu
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
