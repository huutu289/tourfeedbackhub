'use client';

import { type ReactNode, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  MessageSquare,
  UserCog,
  ChevronDown,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/use-admin';
import type {
  NavigationAudience,
  NavigationMenuItem as NavigationMenuEntry,
  SiteSettings,
} from '@/lib/types';

interface HeaderProps {
  menu: NavigationMenuEntry[];
  siteSettings: SiteSettings;
}

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const ADMIN_LINK = {
  href: '/admin/dashboard',
  label: 'CMS',
};

function resolveIcon(name?: string): IconComponent | undefined {
  if (!name) return undefined;
  const Icon = (LucideIcons as unknown as Record<string, IconComponent | undefined>)[name];
  return Icon;
}

function matchesAudience(item: NavigationMenuEntry, audience: NavigationAudience): boolean {
  if (!item.visibleFor || item.visibleFor.length === 0) {
    return true;
  }

  if (audience === 'admin') {
    return item.visibleFor.includes('admin') || item.visibleFor.includes('user') || item.visibleFor.includes('guest');
  }

  if (audience === 'user') {
    return item.visibleFor.includes('user') || item.visibleFor.includes('guest');
  }

  return item.visibleFor.includes('guest');
}

function sortByOrder(items: NavigationMenuEntry[]): NavigationMenuEntry[] {
  return [...items].sort((a, b) => {
    if (a.order === b.order) {
      return a.label.localeCompare(b.label);
    }
    return a.order - b.order;
  });
}

function filterMenuByAudience(
  items: NavigationMenuEntry[],
  audience: NavigationAudience
): NavigationMenuEntry[] {
  const filtered: NavigationMenuEntry[] = [];
  items.forEach((item) => {
    const children = item.children ? filterMenuByAudience(item.children, audience) : [];
    const isVisible = matchesAudience(item, audience);
    if (isVisible || children.length > 0) {
      filtered.push({
        ...item,
        children,
      });
    }
  });
  return sortByOrder(filtered);
}

function deriveAudience(isAdmin: boolean, hasUser: boolean): NavigationAudience {
  if (isAdmin) return 'admin';
  if (hasUser) return 'user';
  return 'guest';
}

function isExternalHref(item: NavigationMenuEntry): boolean {
  return item.type === 'external' || /^https?:\/\//i.test(item.href);
}

function normaliseHref(href: string | undefined): string {
  if (!href) return '#';
  return href;
}

interface NavLinkProps {
  item: NavigationMenuEntry;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

function NavLink({ item, className, children, onClick }: NavLinkProps) {
  const href = normaliseHref(item.href);
  if (isExternalHref(item)) {
    const target = item.target ?? '_self';
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} target={item.target} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

function ItemLabel({ item }: { item: NavigationMenuEntry }) {
  const Icon = resolveIcon(item.icon);
  return (
    <span className="flex items-center gap-2">
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{item.label}</span>
      {item.badge ? (
        <Badge
          className={cn('ml-2', !item.badge.color && 'bg-primary text-primary-foreground')}
          style={
            item.badge.color
              ? { backgroundColor: item.badge.color, borderColor: item.badge.color }
              : undefined
          }
        >
          {item.badge.text}
        </Badge>
      ) : null}
    </span>
  );
}

function DesktopDropdownList({ items }: { items: NavigationMenuEntry[] }) {
  return (
    <ul className="grid w-[240px] gap-3 p-4">
      {items.map((child) => (
        <li key={child.id}>
          <NavigationMenuLink asChild>
            <NavLink
              item={child}
              className="block rounded-md border border-transparent bg-background/80 p-3 text-sm leading-none text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent-foreground"
            >
              <ItemLabel item={child} />
            </NavLink>
          </NavigationMenuLink>
          {child.children && child.children.length > 0 ? (
            <div className="mt-2 space-y-2 border-l pl-3">
              {child.children.map((grandChild) => (
                <NavLink
                  key={grandChild.id}
                  item={grandChild}
                  className="block text-sm text-foreground/80 transition hover:text-accent"
                >
                  <ItemLabel item={grandChild} />
                </NavLink>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function BrandMark({
  siteName,
  logoLight,
  logoDark,
  className,
}: {
  siteName: string;
  logoLight?: string;
  logoDark?: string;
  className?: string;
}) {
  const hasLogo = Boolean(logoLight || logoDark);

  return (
    <span className={cn('flex items-center gap-3', className)}>
      {hasLogo ? (
        <>
          {logoLight ? (
            <img
              src={logoLight}
              alt={siteName}
              className={cn('h-8 w-auto', logoDark && 'dark:hidden')}
            />
          ) : null}
          {logoDark ? (
            <img src={logoDark} alt={siteName} className="hidden h-8 w-auto dark:block" />
          ) : null}
        </>
      ) : (
        <MessageSquare className="h-6 w-6 text-accent" />
      )}
      <span className="font-bold font-headline text-lg">{siteName}</span>
    </span>
  );
}

function MobileNavItems({
  items,
  depth = 0,
}: {
  items: NavigationMenuEntry[];
  depth?: number;
}) {
  return (
    <div className={cn(depth > 0 && 'pl-4')}>
      {items.map((item) => (
        <div key={item.id} className="space-y-2 py-1">
          <SheetClose asChild>
            <NavLink
              item={item}
              className={cn(
                'flex items-center justify-between text-foreground',
                depth === 0 ? 'text-lg font-medium' : 'text-base'
              )}
            >
              <ItemLabel item={item} />
              {item.children && item.children.length > 0 ? <ChevronDown className="h-4 w-4" /> : null}
            </NavLink>
          </SheetClose>
          {item.children && item.children.length > 0 ? (
            <MobileNavItems items={item.children} depth={depth + 1} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function useFilteredMenu(menu: NavigationMenuEntry[], audience: NavigationAudience) {
  return useMemo(() => filterMenuByAudience(menu, audience), [menu, audience]);
}

function findCtaItem(items: NavigationMenuEntry[]): NavigationMenuEntry | undefined {
  return items.find((item) => item.group === 'cta');
}

function separateMenuItems(items: NavigationMenuEntry[]) {
  const cta = findCtaItem(items);
  const primary = cta ? items.filter((item) => item.id !== cta.id) : items;
  return { primary, cta };
}

function useActivePath(pathname: string) {
  return useMemo(() => pathname.replace(/\/$/, '') || '/', [pathname]);
}

function isItemActive(item: NavigationMenuEntry, activePath: string): boolean {
  if (isExternalHref(item)) return false;
  const href = normaliseHref(item.href);
  const [base] = href.split('?');
  if (!base) return false;
  if (base === '/') {
    return activePath === '/';
  }
  return activePath === base || activePath.startsWith(`${base}/`);
}

export default function Header({ menu, siteSettings }: HeaderProps) {
  const pathname = usePathname();
  const { isAdmin, user } = useAdmin();
  const isAdminRoute = pathname.startsWith('/admin');
  const audience = deriveAudience(isAdmin, Boolean(user));
  const filteredMenu = useFilteredMenu(menu, audience);
  const { primary, cta } = separateMenuItems(filteredMenu);
  const activePath = useActivePath(pathname);

  if (isAdminRoute) {
    return null;
  }

  const logoLight = siteSettings.logoUrlLight;
  const logoDark = siteSettings.logoUrlDark;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 inline-flex items-center">
          <BrandMark siteName={siteSettings.siteName} logoLight={logoLight} logoDark={logoDark} />
        </Link>

        {primary.length > 0 ? (
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              {primary.map((item) => {
                const isActive = isItemActive(item, activePath);
                if (item.children && item.children.length > 0) {
                  return (
                    <NavigationMenuItem key={item.id}>
                      <NavigationMenuTrigger className={cn(isActive && 'text-accent')}>
                        <ItemLabel item={item} />
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <DesktopDropdownList items={item.children} />
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                );
              }

              return (
                <NavigationMenuItem key={item.id}>
                  <NavigationMenuLink asChild>
                    <NavLink
                      item={item}
                      className={cn(navigationMenuTriggerStyle(), isActive && 'text-accent')}
                    >
                      <ItemLabel item={item} />
                    </NavLink>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
        ) : null}

        <div className="flex flex-1 items-center justify-end gap-2">
          {isAdmin ? (
            <Button asChild variant="secondary" className="hidden md:flex">
              <Link href={ADMIN_LINK.href}>
                <UserCog className="mr-2 h-4 w-4" />
                {ADMIN_LINK.label}
              </Link>
            </Button>
          ) : null}

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex items-center justify-between border-b pb-4">
                  <Link href="/" className="flex items-center gap-2">
                    <BrandMark
                      siteName={siteSettings.siteName}
                      logoLight={logoLight}
                      logoDark={logoDark}
                      className="text-start"
                    />
                  </Link>
                  {isAdmin ? (
                    <SheetClose asChild>
                      <Link
                        href={ADMIN_LINK.href}
                        className="text-sm text-foreground/70 hover:text-accent"
                      >
                        <span className="flex items-center gap-1">
                          <UserCog className="h-4 w-4" />
                          {ADMIN_LINK.label}
                        </span>
                      </Link>
                    </SheetClose>
                  ) : null}
                </div>
                <nav className="flex-1 overflow-y-auto py-6">
                  <MobileNavItems items={filteredMenu} />
                </nav>
                {cta ? (
                  <div className="pt-4">
                    <SheetClose asChild>
                      <Button asChild className="w-full">
                        <NavLink item={cta}>
                          <ItemLabel item={cta} />
                        </NavLink>
                      </Button>
                    </SheetClose>
                  </div>
                ) : null}
              </SheetContent>
            </Sheet>
          </div>

          {cta ? (
            <Button asChild className="hidden md:flex ml-2">
              <NavLink item={cta}>
                <ItemLabel item={cta} />
              </NavLink>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
