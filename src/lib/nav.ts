import type { NavigationMenu, NavigationMenuItem, NavigationMenuKey } from "@/lib/types";
import { getNavigationMenu, buildNavigationTree, flattenNavigationItems } from "@/lib/navigation";

export type MenuResponse = Pick<NavigationMenu, "id" | "locale" | "title" | "published" | "updatedAt"> & {
  items: NavigationMenuItem[];
};

function ensureTree(menu: NavigationMenu): NavigationMenuItem[] {
  if (menu.items && menu.items.length) {
    return menu.items;
  }
  if (menu.flatItems && menu.flatItems.length) {
    return buildNavigationTree(menu.flatItems);
  }
  return [];
}

export async function getMenu(
  key: NavigationMenuKey,
  locale: string | null = null
): Promise<MenuResponse> {
  const menu = await getNavigationMenu(key, locale ?? undefined);
  const items = ensureTree(menu);
  return {
    id: menu.id,
    locale: menu.locale ?? null,
    title: menu.title,
    published: menu.published,
    updatedAt: menu.updatedAt,
    items,
  };
}

export function getMenuFlatItems(items: NavigationMenuItem[]): NavigationMenuItem[] {
  return flattenNavigationItems(items);
}
