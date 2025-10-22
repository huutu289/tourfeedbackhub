'use client';

import {useMemo, useState} from 'react';
import {Plus, Search, Edit, Trash2, MoreVertical, UserCircle, Mail, Shield, Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {User, UserRole} from '@/lib/types';
import {format} from 'date-fns';
import {useAuth, useFirestore} from '@/firebase/provider';
import {useMemoFirebase} from '@/firebase/firestore/use-memo-firebase';
import {useCollection} from '@/firebase/firestore/use-collection';
import {collection} from 'firebase/firestore';
import {useToast} from '@/hooks/use-toast';

type AdminUser = User & {
  hasCreatedAt: boolean;
  hasLastLoginAt: boolean;
};

const parseTimestamp = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof (value as {toDate?: () => Date}).toDate === 'function') {
    const result = (value as {toDate: () => Date}).toDate();
    if (result instanceof Date && !Number.isNaN(result.getTime())) {
      return result;
    }
  }
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('subscriber');
  const [status, setStatus] = useState<User['status']>('active');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const firestore = useFirestore();
  const auth = useAuth();
  const {toast} = useToast();
  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const {data: userDocs, isLoading} = useCollection(usersCollection);

  const users = useMemo<AdminUser[]>(() => {
    if (!userDocs) return [];
    return userDocs.map((doc) => {
      const createdAt = parseTimestamp((doc as any).createdAt);
      const lastLoginAt = parseTimestamp((doc as any).lastLoginAt);
      const roleValue = ((doc as any).role ?? 'subscriber') as UserRole;
      const statusValue = ((doc as any).status ?? 'active') as User['status'];
      return {
        id: doc.id,
        email: (doc as any).email ?? '',
        displayName: (doc as any).displayName ?? (doc as any).email ?? 'Unnamed user',
        role: roleValue,
        avatarUrl: (doc as any).avatarUrl ?? undefined,
        bio: (doc as any).bio ?? undefined,
        website: (doc as any).website ?? undefined,
        socialLinks: (doc as any).socialLinks ?? undefined,
        createdAt: createdAt ?? new Date(),
        lastLoginAt,
        status: statusValue,
        permissions: Array.isArray((doc as any).permissions) ? (doc as any).permissions : undefined,
        hasCreatedAt: Boolean(createdAt),
        hasLastLoginAt: Boolean(lastLoginAt),
      } satisfies AdminUser;
    });
  }, [userDocs]);

  const resetForm = () => {
    setEmail('');
    setDisplayName('');
    setRole('subscriber');
    setStatus('active');
    setEditingUser(null);
  };

  const handleDialogChange = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      resetForm();
    }
  };

  const handleOpenDialog = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user);
      setEmail(user.email);
      setDisplayName(user.displayName);
      setRole(user.role);
      setStatus(user.status);
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedDisplayName = displayName.trim();
    const safeDisplayName =
      trimmedDisplayName || (editingUser ? editingUser.email : trimmedEmail);

    if (!editingUser && !trimmedEmail) {
      toast({
        variant: 'destructive',
        title: 'Email is required',
        description: 'Provide a unique email to create a new user.',
      });
      return;
    }

    if (!safeDisplayName) {
      toast({
        variant: 'destructive',
        title: 'Display name is required',
        description: 'Add a display name so other admins can recognise this user.',
      });
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Sign in again to manage users.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const idToken = await currentUser.getIdToken();
      const endpoint = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = {
        displayName: safeDisplayName,
        role,
        status,
      };

      if (!editingUser) {
        body.email = trimmedEmail;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message = errorPayload?.error ?? 'Failed to save user';
        throw new Error(message);
      }

      toast({
        title: editingUser ? 'User updated' : 'User created',
        description: editingUser
          ? 'User details have been updated.'
          : 'The user can now sign in with the specified email.',
      });

      handleDialogChange(false);
    } catch (error: any) {
      console.error('Error saving user', error);
      toast({
        variant: 'destructive',
        title: 'Unable to save user',
        description: error?.message ?? 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Sign in again to manage users.',
      });
      return;
    }

    setDeletingUserId(userId);
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message = errorPayload?.error ?? 'Failed to delete user';
        throw new Error(message);
      }

      toast({
        title: 'User deleted',
        description: 'The user record has been removed.',
      });
    } catch (error: any) {
      console.error('Error deleting user', error);
      toast({
        variant: 'destructive',
        title: 'Unable to delete user',
        description: error?.message ?? 'Please try again.',
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, {variant: any; icon: React.ReactNode}> = {
      admin: {variant: 'destructive', icon: <Shield className="h-3 w-3" />},
      editor: {variant: 'default', icon: <Edit className="h-3 w-3" />},
      author: {variant: 'secondary', icon: <UserCircle className="h-3 w-3" />},
      contributor: {variant: 'outline', icon: <UserCircle className="h-3 w-3" />},
      subscriber: {variant: 'outline', icon: <UserCircle className="h-3 w-3" />},
    };

    const config = variants[role];
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: User['status']) => {
    const variants = {
      active: {variant: 'default' as const, label: 'Active'},
      inactive: {variant: 'secondary' as const, label: 'Inactive'},
      banned: {variant: 'destructive' as const, label: 'Banned'},
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">Users</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage user accounts and permissions
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-none p-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="author">Author</SelectItem>
              <SelectItem value="contributor">Contributor</SelectItem>
              <SelectItem value="subscriber">Subscriber</SelectItem>
            </SelectContent>
          </Select>
          </div>

        {filteredUsers.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:hidden">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-col gap-1">
                        <p className="text-base font-semibold leading-tight">
                          {user.displayName}
                        </p>
                        <p className="text-sm text-muted-foreground break-all">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(user.role)}
                        <Badge variant="outline" className="capitalize">
                          {user.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">Joined</p>
                          <p>
                            {user.hasCreatedAt ? format(user.createdAt, 'MMM d, yyyy') : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Last login</p>
                          <p>
                            {user.hasLastLoginAt && user.lastLoginAt
                              ? format(user.lastLoginAt, 'MMM d, yyyy')
                              : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(user)}
                      className="flex-1 min-w-[120px]"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 min-w-[120px]">
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 min-w-[120px]"
                      onClick={() => void handleDelete(user.id)}
                      disabled={deletingUserId === user.id}
                    >
                      {deletingUserId === user.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatarUrl} />
                              <AvatarFallback>
                                {user.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[180px]">
                                {user.displayName}
                              </p>
                              <p className="text-sm text-muted-foreground truncate max-w-[220px]">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          {user.hasCreatedAt ? format(user.createdAt, 'MMM d, yyyy') : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {user.hasLastLoginAt && user.lastLoginAt
                            ? format(user.lastLoginAt, 'MMM d, yyyy')
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(user)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleDelete(user.id)}
                              disabled={deletingUserId === user.id}
                            >
                              {deletingUserId === user.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading users...
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        )}
      </Card>

      <Dialog open={showDialog} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={!!editingUser || isSaving}
              />
            </div>

            <div>
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                disabled={isSaving}
              />
            </div>

            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger disabled={isSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscriber">Subscriber</SelectItem>
                  <SelectItem value="contributor">Contributor</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {role === 'admin' && 'Full access to all features and settings'}
                {role === 'editor' && 'Can publish and manage posts including others'}
                {role === 'author' && 'Can publish and manage their own posts'}
                {role === 'contributor' && 'Can write and manage own posts but cannot publish'}
                {role === 'subscriber' && 'Can only manage their profile'}
              </p>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as User['status'])}>
                <SelectTrigger disabled={isSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingUser ? (
                'Update User'
              ) : (
                'Add User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
