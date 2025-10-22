'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, MessageSquare, Users, Image } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  const actions = [
    {
      label: 'New Post',
      href: '/admin/posts/new',
      icon: Plus,
      description: 'Create a new blog post',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      label: 'View Comments',
      href: '/admin/comments',
      icon: MessageSquare,
      description: 'Moderate comments',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      label: 'Manage Users',
      href: '/admin/users',
      icon: Users,
      description: 'Add or edit users',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      label: 'Media Library',
      href: '/admin/posts/new',
      icon: Image,
      description: 'Upload media files',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4 hover:bg-accent/50 transition-all group"
              >
                <div className={`p-2 rounded-lg ${action.color} text-white transition-transform group-hover:scale-110`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
