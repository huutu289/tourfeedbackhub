'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/use-admin';
import type {
  ContactInfo,
  NavigationArea,
  NavigationAudience,
  NavigationMenuItem,
  SiteSettings,
  SocialLinks,
} from '@/lib/types';

interface FooterProps {
  menu: NavigationMenuItem[];
  siteSettings: SiteSettings;
}

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const AREA_TITLES: Record<NavigationArea, string> = {
  links: 'Explore',
  legal: 'Legal',
  social: 'Connect',
  contact: 'Contact',
  cta: 'Actions',
};

const CONTACT_ICON_MAP: Partial<Record<keyof ContactInfo, string>> = {
  email: 'Mail',
  phone: 'Phone',
  whatsapp: 'MessageCircle',
  zalo: 'MessageSquare',
  address: 'MapPin',
  location: 'MapPin',
};

const SOCIAL_ICON_MAP: Partial<Record<keyof SocialLinks, string>> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'Youtube',
  tiktok: 'Music2',
  whatsapp: 'MessageCircle',
  zalo: 'MessageSquare',
};

function resolveIcon(name?: string): IconComponent | undefined {
  if (!name) return undefined;
  return (LucideIcons as unknown as Record<string, IconComponent | undefined>)[name];
}

function matchesAudience(item: NavigationMenuItem, audience: NavigationAudience): boolean {
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

function deriveAudience(isAdmin: boolean, hasUser: boolean): NavigationAudience {
  if (isAdmin) return 'admin';
  if (hasUser) return 'user';
  return 'guest';
}

function normalizeHref(href?: string): string {
  if (!href) return '#';
  return href;
}

function isExternal(item: NavigationMenuItem): boolean {
  return item.type === 'external' || /^https?:\/\//i.test(item.href);
}

function flattenMenuItems(items: NavigationMenuItem[]): NavigationMenuItem[] {
  const result: NavigationMenuItem[] = [];
  const visit = (item: NavigationMenuItem) => {
    const { children, ...rest } = item;
    result.push({ ...rest });
    if (children && children.length > 0) {
      children.forEach(visit);
    }
  };
  items.forEach(visit);
  return result;
}

function groupByArea(items: NavigationMenuItem[]): Partial<Record<NavigationArea, NavigationMenuItem[]>> {
  const groups: Partial<Record<NavigationArea, NavigationMenuItem[]>> = {};
  items.forEach((item) => {
    if (!item.area) return;
    const areaItems = groups[item.area] ?? [];
    areaItems.push(item);
    groups[item.area] = areaItems;
  });

  Object.values(groups).forEach((areaItems) => {
    areaItems.sort((a, b) => {
      if (a.order === b.order) {
        return a.label.localeCompare(b.label);
      }
      return a.order - b.order;
    });
  });

  return groups;
}

function renderIcon(name?: string, className?: string) {
  const Icon = resolveIcon(name);
  if (!Icon) return null;
  return <Icon className={cn('h-4 w-4', className)} />;
}

function buildContactDetails(contact: ContactInfo): Array<{ id: string; label: string; href?: string; icon?: string }> {
  const details: Array<{ id: string; label: string; href?: string; icon?: string }> = [];

  if (contact.email) {
    details.push({
      id: 'email',
      label: contact.email,
      href: `mailto:${contact.email}`,
      icon: CONTACT_ICON_MAP.email,
    });
  }

  if (contact.phone) {
    const sanitized = contact.phone.replace(/\s+/g, '');
    details.push({
      id: 'phone',
      label: contact.phone,
      href: `tel:${sanitized}`,
      icon: CONTACT_ICON_MAP.phone,
    });
  }

  if (contact.whatsapp) {
    const href = contact.whatsapp.startsWith('http')
      ? contact.whatsapp
      : `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`;
    details.push({
      id: 'whatsapp',
      label: 'WhatsApp',
      href,
      icon: CONTACT_ICON_MAP.whatsapp,
    });
  }

  if (contact.address || contact.location) {
    details.push({
      id: 'address',
      label: contact.address ?? contact.location ?? '',
      href: contact.mapEmbedUrl,
      icon: CONTACT_ICON_MAP.address,
    });
  }

  if (contact.zalo) {
    details.push({
      id: 'zalo',
      label: 'Zalo',
      href: contact.zalo,
      icon: CONTACT_ICON_MAP.zalo,
    });
  }

  return details.filter((detail) => detail.label);
}

function buildSocialLinks(social: SocialLinks): NavigationMenuItem[] {
  const entries: NavigationMenuItem[] = [];
  (Object.entries(social) as Array<[keyof SocialLinks, string | undefined]>).forEach(([key, value]) => {
    if (!value) return;
    const iconName = SOCIAL_ICON_MAP[key];
    entries.push({
      id: `social-${key}`,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      href: value,
      order: entries.length + 1,
      type: value.startsWith('http') ? 'external' : 'internal',
      parentId: null,
      icon: iconName,
      target: '_blank',
      area: 'social',
    });
  });
  return entries;
}

function mergeSocialItems(menuItems: NavigationMenuItem[] | undefined, social: SocialLinks): NavigationMenuItem[] {
  const items = menuItems ? [...menuItems] : [];
  const existingHrefs = new Set(items.map((item) => item.href));
  const fallbackSocial = buildSocialLinks(social);
  fallbackSocial.forEach((item) => {
    if (!existingHrefs.has(item.href)) {
      items.push(item);
    }
  });
  return items.sort((a, b) => a.order - b.order);
}

function FooterLink({ item }: { item: NavigationMenuItem }) {
  const href = normalizeHref(item.href);
  const isExternalLink = isExternal(item);
  const Icon = item.icon ? resolveIcon(item.icon) : undefined;

  if (isExternalLink) {
    return (
      <a
        key={item.id}
        href={href}
        target={item.target ?? '_self'}
        rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
        className="flex items-center gap-2 text-sm text-foreground/80 transition hover:text-accent"
      >
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span>{item.label}</span>
      </a>
    );
  }

  return (
    <Link
      key={item.id}
      href={href}
      target={item.target}
      className="flex items-center gap-2 text-sm text-foreground/80 transition hover:text-accent"
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{item.label}</span>
    </Link>
  );
}

function ContactDetail({ detail }: { detail: { id: string; label: string; href?: string; icon?: string } }) {
  const Icon = resolveIcon(detail.icon);
  if (detail.href) {
    return (
      <a
        key={detail.id}
        href={detail.href}
        className="flex items-center gap-2 text-sm text-foreground/80 transition hover:text-accent"
      >
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span>{detail.label}</span>
      </a>
    );
  }

  return (
    <span key={detail.id} className="flex items-center gap-2 text-sm text-foreground/80">
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{detail.label}</span>
    </span>
  );
}

export default function Footer({ menu, siteSettings }: FooterProps) {
  const pathname = usePathname();
  const { isAdmin, user } = useAdmin();

  if (pathname.startsWith('/admin')) {
    return null;
  }

  const audience = deriveAudience(isAdmin, Boolean(user));
  const flatMenu = flattenMenuItems(menu).filter((item) => matchesAudience(item, audience));
  const groupedByArea = groupByArea(flatMenu);

  const links = groupedByArea.links ?? [];
  const legal = groupedByArea.legal ?? [];
  const contactLinks = groupedByArea.contact ?? [];
  const socialLinks = mergeSocialItems(groupedByArea.social, siteSettings.social);
  const ctaLinks = groupedByArea.cta ?? [];
  const contactDetails = buildContactDetails(siteSettings.contact);
  const tagline = siteSettings.missionStatement ?? siteSettings.heroSubtitle ?? '';
  const { logoUrlLight, logoUrlDark } = siteSettings;

  return (
    <footer className="border-t bg-secondary/50">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              {logoUrlLight || logoUrlDark ? (
                <>
                  {logoUrlLight ? (
                    <img
                      src={logoUrlLight}
                      alt={siteSettings.siteName}
                      className={cn('h-9 w-auto', logoUrlDark && 'dark:hidden')}
                    />
                  ) : null}
                  {logoUrlDark ? (
                    <img
                      src={logoUrlDark}
                      alt={siteSettings.siteName}
                      className="hidden h-9 w-auto dark:block"
                    />
                  ) : null}
                </>
              ) : (
                <MessageSquare className="h-7 w-7 text-accent" />
              )}
              <span className="text-xl font-headline font-bold">{siteSettings.siteName}</span>
            </Link>
            {tagline ? <p className="text-sm text-muted-foreground">{tagline}</p> : null}
            {contactDetails.length ? (
              <div className="space-y-2">
                {contactDetails.map((detail) => (
                  <ContactDetail key={detail.id} detail={detail} />
                ))}
              </div>
            ) : null}
          </div>

          {links.length ? (
            <div>
              <h4 className="font-semibold"> {AREA_TITLES.links}</h4>
              <div className="mt-4 flex flex-col gap-2">
                {links.map((item) => (
                  <FooterLink key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          {legal.length ? (
            <div>
              <h4 className="font-semibold">{AREA_TITLES.legal}</h4>
              <div className="mt-4 flex flex-col gap-2">
                {legal.map((item) => (
                  <FooterLink key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
            {contactLinks.length ? (
              <div>
                <h4 className="font-semibold">{AREA_TITLES.contact}</h4>
                <div className="mt-4 flex flex-col gap-2">
                  {contactLinks.map((item) => (
                    <FooterLink key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ) : null}

            {socialLinks.length ? (
              <div>
                <h4 className="font-semibold">{AREA_TITLES.social}</h4>
                <div className="mt-4 flex gap-4 text-foreground/70">
                  {socialLinks.map((item) => {
                    const Icon = item.icon ? resolveIcon(item.icon) : undefined;
                    const href = normalizeHref(item.href);
                    const isExternalLink = isExternal(item);
                    const content = Icon ? <Icon className="h-5 w-5" /> : <span>{item.label}</span>;
                    if (isExternalLink) {
                      return (
                        <a
                          key={item.id}
                          href={href}
                          target={item.target ?? '_self'}
                          rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                          aria-label={item.label}
                          className="transition hover:text-accent"
                        >
                          {content}
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={item.id}
                        href={href}
                        target={item.target}
                        aria-label={item.label}
                        className="transition hover:text-accent"
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {ctaLinks.length ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {ctaLinks.map((item) => (
              <Button key={item.id} asChild>
                {isExternal(item) ? (
                  <a
                    href={normalizeHref(item.href)}
                    target={item.target ?? '_self'}
                    rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link href={normalizeHref(item.href)} target={item.target}>
                    {item.label}
                  </Link>
                )}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          <p>{siteSettings.copyright ?? `© ${new Date().getFullYear()} ${siteSettings.siteName}. All rights reserved.`}</p>
        </div>
      </div>
    </footer>
  );
}
