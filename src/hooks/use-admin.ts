/**
 * Hook to check if current user is an admin
 */

'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { isUserAdmin } from '@/lib/admin-auth';

export function useAdmin() {
  const { user, isUserLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (isUserLoading) {
        return; // Wait for user to load
      }

      if (!user) {
        setIsAdmin(false);
        setIsAdminLoading(false);
        return;
      }

      try {
        const adminStatus = await isUserAdmin(user);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsAdminLoading(false);
      }
    }

    checkAdminStatus();
  }, [user, isUserLoading]);

  return {
    isAdmin,
    isAdminLoading: isUserLoading || isAdminLoading,
    user,
  };
}
