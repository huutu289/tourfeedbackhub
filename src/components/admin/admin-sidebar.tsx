"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  MessageSquare,
  Settings,
  Star,
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

const menuItems = [
  {
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    tooltip: "Dashboard",
  },
  {
    href: "/admin/tours",
    icon: Map,
    label: "Tours",
    tooltip: "Manage Tours",
  },
  {
    href: "/admin/reviews",
    icon: Star,
    label: "Reviews",
    tooltip: "Manage Reviews",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    label: "Settings",
    tooltip: "Site Settings",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

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
      <SidebarFooter>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/">
            <Settings />
            <span>Back to Site</span>
          </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
