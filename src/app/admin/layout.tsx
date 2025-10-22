'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar, adminMenuGroups } from "@/components/admin/admin-sidebar";
import { AdminRouteGuard } from "@/components/admin/admin-route-guard";
import './admin-mobile.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const currentRoute = useMemo(() => {
    for (const group of adminMenuGroups) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
          return item.label;
        }
      }
    }
    return null;
  }, [pathname]);

  useEffect(() => {
    document.body.classList.add('cms-skin');
    return () => {
      document.body.classList.remove('cms-skin');
    };
  }, []);

  if (isLoginPage) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  return (
    <AdminRouteGuard>
      <SidebarProvider className="bg-background text-foreground">
        <AdminSidebar />
        <SidebarInset className="bg-muted/30 text-foreground">
          <div className="flex min-h-svh flex-col">
            <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3 shadow-sm md:hidden">
              <SidebarTrigger className="-ml-1 h-9 w-9 rounded-lg border border-border/80 bg-card text-foreground shadow-sm" />
              <span className="text-sm font-semibold text-foreground">
                {currentRoute || 'Menu'}
              </span>
            </div>
            <div className="admin-page flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminRouteGuard>
  );
}
