'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/use-admin';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter();
  const { isAdmin, isAdminLoading, user } = useAdmin();

  useEffect(() => {
    if (!isAdminLoading && !user) {
      // Not logged in, redirect to login
      router.push('/admin/login');
    } else if (!isAdminLoading && user && !isAdmin) {
      // Logged in but not admin, show access denied
      // Don't redirect to avoid infinite loops
    }
  }, [isAdmin, isAdminLoading, user, router]);

  // Show loading state
  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>You do not have permission to access the admin area.</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Go to Home
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/login')}
                className="w-full"
              >
                Sign In as Admin
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show nothing while redirecting (not logged in)
  if (!user) {
    return null;
  }

  // User is admin, show protected content
  return <>{children}</>;
}
