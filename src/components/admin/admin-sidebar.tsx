"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  MessageSquare,
  Settings,
  Star,
  LogOut,
  BookText,
  Layers,
  FileText,
  Users,
  Languages,
  MapPinned,
  Flag,
  Navigation,
  LayoutTemplate,
  Images,
  FolderOpen,
  Tags,
  Palette,
  BarChart3,
  User,
  UserCircle,
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase/provider";

export const adminMenuGroups = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
        tooltip: "Dashboard overview",
      },
      {
        href: "/admin/analytics",
        icon: BarChart3,
        label: "Analytics",
        tooltip: "View site analytics",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        href: "/admin/posts",
        icon: FileText,
        label: "Posts",
        tooltip: "Manage blog posts",
      },
      {
        href: "/admin/categories",
        icon: FolderOpen,
        label: "Categories",
        tooltip: "Manage categories",
      },
      {
        href: "/admin/tags",
        icon: Tags,
        label: "Tags",
        tooltip: "Manage tags",
      },
      {
        href: "/admin/comments",
        icon: MessageSquare,
        label: "Comments",
        tooltip: "Moderate comments",
      },
    ],
  },
  {
    label: "Tours & Reviews",
    items: [
      {
        href: "/admin/tour-types",
        icon: Layers,
        label: "Tour Types",
        tooltip: "Manage tour types",
      },
      {
        href: "/admin/tours",
        icon: Map,
        label: "Tours",
        tooltip: "Manage tours",
      },
      {
        href: "/admin/stories",
        icon: BookText,
        label: "Stories",
        tooltip: "Manage stories",
      },
      {
        href: "/admin/reviews",
        icon: Star,
        label: "Reviews",
        tooltip: "Manage reviews",
      },
      {
        href: "/admin/guides",
        icon: User,
        label: "Guides",
        tooltip: "Manage guides",
      },
    ],
  },
  {
    label: "Media & Design",
    items: [
      {
        href: "/admin/slide-bar",
        icon: Images,
        label: "Hero Slides",
        tooltip: "Manage hero slides",
      },
      {
        href: "/admin/appearance",
        icon: Palette,
        label: "Appearance",
        tooltip: "Customize theme",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        href: "/admin/account",
        icon: UserCircle,
        label: "Account",
        tooltip: "Account settings",
      },
      {
        href: "/admin/users",
        icon: Users,
        label: "Users",
        tooltip: "Manage users",
      },
      {
        href: "/admin/settings",
        icon: Settings,
        label: "Site Settings",
        tooltip: "General settings",
      },
      {
        href: "/admin/navigation",
        icon: Navigation,
        label: "Navigation",
        tooltip: "Header navigation",
      },
      {
        href: "/admin/footer",
        icon: LayoutTemplate,
        label: "Footer",
        tooltip: "Footer navigation",
      },
    ],
  },
  {
    label: "Master Data",
    items: [
      {
        href: "/admin/master-data/languages",
        icon: Languages,
        label: "Languages",
        tooltip: "Tour languages",
      },
      {
        href: "/admin/master-data/provinces",
        icon: MapPinned,
        label: "Provinces",
        tooltip: "Guide provinces",
      },
      {
        href: "/admin/master-data/nationalities",
        icon: Flag,
        label: "Nationalities",
        tooltip: "Guest nationalities",
      },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/admin/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
            <MessageSquare className="w-8 h-8 text-primary"/>
            <span className="text-xl font-headline font-bold group-data-[collapsible=icon]:hidden">
                Tour Insights CMS
            </span>
            <div className="flex-1" />
            <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {adminMenuGroups.map((group, idx) => (
          <SidebarGroup key={idx}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                    tooltip={{
                      children: item.tooltip,
                      side: "right",
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={closeMobileSidebar}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/" onClick={closeMobileSidebar}>
            <Settings />
            <span className="group-data-[collapsible=icon]:hidden">Back to Site</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={async () => {
            closeMobileSidebar();
            await handleLogout();
          }}
        >
            <LogOut />
            <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
