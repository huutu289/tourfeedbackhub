'use client';

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

  // Don't protect the login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Protect all other admin pages
  return (
    <AdminRouteGuard>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AdminRouteGuard>
  );
}
