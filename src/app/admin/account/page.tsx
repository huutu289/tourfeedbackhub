'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  reauthenticateWithPopup
} from 'firebase/auth';
import { useAuth, useUser } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, User, Mail, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don&apos;t match",
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AccountSettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com');
  const isPasswordUser = user?.providerData.some(p => p.providerId === 'password');

  const handlePasswordChange = async (values: PasswordFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please log in again.',
      });
      return;
    }

    setIsChangingPassword(true);
    setPasswordChangeSuccess(false);

    try {
      // Re-authenticate user first (required for password change)
      if (isPasswordUser) {
        // Email/password user - use current password for re-auth
        const credential = EmailAuthProvider.credential(
          user.email!,
          values.currentPassword
        );
        await reauthenticateWithCredential(user, credential);
      } else if (isGoogleUser) {
        // Google user - use popup re-auth
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }

      // Update password
      await updatePassword(user, values.newPassword);

      setPasswordChangeSuccess(true);
      form.reset();

      toast({
        title: 'Password changed successfully',
        description: 'Your password has been updated. Please use your new password for future logins.',
      });

      // Clear success message after 5 seconds
      setTimeout(() => setPasswordChangeSuccess(false), 5000);
    } catch (error: any) {
      console.error('Password change error:', error);

      let errorMessage = 'Failed to change password. Please try again.';

      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect.';
        form.setError('currentPassword', { message: 'Incorrect password' });
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
        form.setError('newPassword', { message: 'Password too weak' });
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security reasons, please log out and log in again before changing your password.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Authentication popup was closed. Please try again.';
      }

      toast({
        variant: 'destructive',
        title: 'Password change failed',
        description: errorMessage,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push('/admin/login');
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-headline font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account security and profile information
        </p>
      </div>

      {/* Account Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your current account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground break-all">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Authentication Methods</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {isPasswordUser && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Email/Password
                    </span>
                  )}
                  {isGoogleUser && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Google
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">User ID</p>
                <p className="text-sm text-muted-foreground font-mono break-all">{user.uid}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            {isPasswordUser
              ? 'Update your password to keep your account secure'
              : isGoogleUser
              ? 'Set a password for email/password authentication in addition to Google Sign-In'
              : 'Set a password for your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordChangeSuccess && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your password has been changed successfully!
              </AlertDescription>
            </Alert>
          )}

          {isGoogleUser && !isPasswordUser && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You currently sign in with Google. Setting a password will allow you to sign in with email/password as well.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePasswordChange)} className="space-y-4">
              {isPasswordUser && (
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your current password"
                          disabled={isChangingPassword}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isGoogleUser && !isPasswordUser && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You&apos;ll need to verify your Google account before setting a password.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your new password"
                        disabled={isChangingPassword}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters long
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your new password"
                        disabled={isChangingPassword}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={isChangingPassword}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto">
                  {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPasswordUser ? 'Change Password' : 'Set Password'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Use a unique password that you don't use for other accounts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Make your password at least 12 characters long</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Include a mix of uppercase, lowercase, numbers, and symbols</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Change your password regularly (every 3-6 months)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Never share your password with anyone</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
