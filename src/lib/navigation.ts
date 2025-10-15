import { cache } from "react";
import { initializeFirebaseAdmin } from "@/firebase/admin";
import { footerNavigationMenu, headerNavigationMenu } from "@/lib/data";
import type {
  NavigationArea,
  NavigationAudience,
  NavigationItemType,
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuKey,
} from "@/lib/types";

type FirestoreDocument = {
  id: string;
  data: FirebaseFirestore.DocumentData;
};

const FALLBACK_MENUS: Record<NavigationMenuKey, NavigationMenu> = {
  header: headerNavigationMenu,
  footer: footerNavigationMenu,
};

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
    return undefined;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function normaliseLocale(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

function cloneFlatItems(items: NavigationMenuItem[]): NavigationMenuItem[] {
  return items.map((item) => {
    const { children, ...rest } = item;
    return { ...rest };
  });
}

function sortNavigation(items: NavigationMenuItem[]): void {
  items.sort((a, b) => {
    if (a.order === b.order) {
      return a.label.localeCompare(b.label);
    }
    return a.order - b.order;
  });
  items.forEach((item) => {
    if (item.children && item.children.length) {
      sortNavigation(item.children);
    }
  });
}

export function buildNavigationTree(flatItems: NavigationMenuItem[]): NavigationMenuItem[] {
  const clones = flatItems.map((item) => ({
    ...item,
    children: [] as NavigationMenuItem[],
  }));

  const byId = new Map<string, NavigationMenuItem>();
  clones.forEach((item) => byId.set(item.id, item));

  const roots: NavigationMenuItem[] = [];
  clones.forEach((item) => {
    const parentId = item.parentId ?? null;
    if (parentId) {
      const parent = byId.get(parentId);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(item);
      } else {
        roots.push(item);
      }
    } else {
      roots.push(item);
    }
  });

  sortNavigation(roots);
  return roots;
}

function cloneMenu(menu: NavigationMenu): NavigationMenu {
  const sourceFlatItems = menu.flatItems ?? flattenNavigationItems(menu.items ?? []);
  const flatItems = cloneFlatItems(sourceFlatItems);
  const items = buildNavigationTree(flatItems);
  return {
    id: menu.id,
    key: menu.key,
    locale: menu.locale ?? null,
    title: menu.title,
    published: menu.published,
    updatedAt: menu.updatedAt ? new Date(menu.updatedAt) : undefined,
    items,
    flatItems,
  };
}

function parseAudienceList(value: unknown): NavigationAudience[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed: NavigationAudience[] = ["guest", "user", "admin"];
  const audiences = value
    .filter((entry) => typeof entry === "string" && allowed.includes(entry as NavigationAudience))
    .map((entry) => entry as NavigationAudience);
  return audiences.length ? audiences : undefined;
}

function parseBadge(value: unknown): NavigationMenuItem["badge"] | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const badge = value as { text?: unknown; color?: unknown };
  if (typeof badge.text !== "string" || !badge.text.trim()) {
    return undefined;
  }
  return {
    text: badge.text.trim(),
    color: typeof badge.color === "string" && badge.color.trim() ? badge.color.trim() : undefined,
  };
}

function mapNavigationItem(doc: FirestoreDocument): NavigationMenuItem {
  const data = doc.data;
  const orderRaw = data.order ?? 0;
  const order = typeof orderRaw === "number" ? orderRaw : Number(orderRaw) || 0;
  const parentId =
    typeof data.parentId === "string" && data.parentId.trim().length
      ? data.parentId.trim()
      : null;

  const target = data.target === "_blank" ? "_blank" : "_self";

  const type: NavigationItemType =
    data.type === "external" || data.type === "hash" ? data.type : "internal";

  const area =
    typeof data.area === "string" && data.area.trim().length
      ? (data.area.trim() as NavigationArea)
      : undefined;

  return {
    id: doc.id,
    label: typeof data.label === "string" && data.label.trim() ? data.label.trim() : doc.id,
    href: typeof data.href === "string" && data.href.trim() ? data.href.trim() : "#",
    type,
    order,
    parentId,
    icon: typeof data.icon === "string" && data.icon.trim() ? data.icon.trim() : undefined,
    target,
    visibleFor: parseAudienceList(data.visibleFor),
    badge: parseBadge(data.badge),
    area,
    group: typeof data.group === "string" && data.group.trim() ? data.group.trim() : undefined,
  };
}

function chooseMenuDoc(
  docs: FirestoreDocument[],
  desiredLocale: string | null,
  key: NavigationMenuKey
): FirestoreDocument | undefined {
  if (!docs.length) return undefined;

  const targetLocale = normaliseLocale(desiredLocale);
  const exactMatch = targetLocale
    ? docs.find((doc) => normaliseLocale(doc.data.locale) === targetLocale)
    : undefined;

  if (exactMatch) return exactMatch;

  const nullLocale = docs.find((doc) => normaliseLocale(doc.data.locale) === null);
  if (nullLocale) return nullLocale;

  return docs.find((doc) => doc.data.key === key) ?? docs[0];
}

async function fetchNavigationMenuInternal(
  key: NavigationMenuKey,
  locale?: string | null
): Promise<NavigationMenu> {
  const admin = initializeFirebaseAdmin();
  if (!admin) {
    return cloneMenu(FALLBACK_MENUS[key]);
  }

  try {
    const snapshot = await admin.firestore
      .collection("navigationMenus")
      .where("key", "==", key)
      .where("published", "==", true)
      .get();

    if (snapshot.empty) {
      return cloneMenu(FALLBACK_MENUS[key]);
    }

    const docs: FirestoreDocument[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    const selectedDoc = chooseMenuDoc(docs, locale ?? null, key);
    if (!selectedDoc) {
      return cloneMenu(FALLBACK_MENUS[key]);
    }

    const itemsSnapshot = await admin.firestore
      .collection(`navigationMenus/${selectedDoc.id}/items`)
      .orderBy("order", "asc")
      .get();

    const flatItems = itemsSnapshot.docs.map((doc) =>
      mapNavigationItem({
        id: doc.id,
        data: doc.data(),
      })
    );

    const items = buildNavigationTree(flatItems);

    return {
      id: selectedDoc.id,
      key,
      locale: normaliseLocale(selectedDoc.data.locale),
      title:
        typeof selectedDoc.data.title === "string" && selectedDoc.data.title.trim()
          ? selectedDoc.data.title.trim()
          : undefined,
      published: true,
      updatedAt: toDate(selectedDoc.data.updatedAt),
      items,
      flatItems,
    };
  } catch (error) {
    console.warn("Failed to load navigation menu, using fallback", error);
    return cloneMenu(FALLBACK_MENUS[key]);
  }
}

export async function fetchNavigationMenu(
  key: NavigationMenuKey,
  locale?: string | null
): Promise<NavigationMenu> {
  return fetchNavigationMenuInternal(key, locale);
}

export const getNavigationMenu = cache(fetchNavigationMenuInternal);

export function getFallbackNavigationMenu(key: NavigationMenuKey): NavigationMenu {
  return cloneMenu(FALLBACK_MENUS[key]);
}

export function flattenNavigationItems(items: NavigationMenuItem[]): NavigationMenuItem[] {
  const result: NavigationMenuItem[] = [];
  const visit = (node: NavigationMenuItem) => {
    const { children, ...rest } = node;
    result.push({ ...rest });
    if (children && children.length) {
      children.forEach(visit);
    }
  };
  items.forEach(visit);
  return result;
}
