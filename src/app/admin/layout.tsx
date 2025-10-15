'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminRouteGuard } from "@/components/admin/admin-route-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

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
          <div className="min-h-svh p-4 sm:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AdminRouteGuard>
  );
}
