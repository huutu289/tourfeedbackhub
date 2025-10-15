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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase/provider";

const menuItems = [
  {
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    tooltip: "Dashboard",
  },
  {
    href: "/admin/settings",
    icon: FileText,
    label: "Site Content",
    tooltip: "Manage About & Contact details",
  },
  {
    href: "/admin/tour-types",
    icon: Layers,
    label: "Tour Types",
    tooltip: "Manage Tour Types",
  },
  {
    href: "/admin/tours",
    icon: Map,
    label: "Tours",
    tooltip: "Manage Tours",
  },
  {
    href: "/admin/stories",
    icon: BookText,
    label: "Stories",
    tooltip: "Manage Stories",
  },
  {
    href: "/admin/reviews",
    icon: Star,
    label: "Reviews",
    tooltip: "Manage Reviews",
  },
  {
    href: "/admin/guides",
    icon: Users,
    label: "Guides",
    tooltip: "Manage Guides",
  },
  {
    href: "/admin/master-data/languages",
    icon: Languages,
    label: "Languages",
    tooltip: "Finished Tour Languages",
  },
  {
    href: "/admin/master-data/provinces",
    icon: MapPinned,
    label: "Provinces",
    tooltip: "Guide Provinces",
  },
  {
    href: "/admin/master-data/nationalities",
    icon: Flag,
    label: "Nationalities",
    tooltip: "Guest Nationalities",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/admin/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-accent"/>
            <span className="text-xl font-headline font-bold group-data-[collapsible=icon]:hidden">
                Tour Insights
            </span>
            <div className="flex-1" />
            <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{
                    children: item.tooltip,
                    side: "right",
                  }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/">
            <Settings />
            <span className="group-data-[collapsible=icon]:hidden">Back to Site</span>
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut />
            <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
