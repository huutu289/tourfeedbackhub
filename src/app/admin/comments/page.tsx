'use client';

import {useState, useMemo} from 'react';
import {Search, Check, X, Trash2, MessageSquare, Loader2, ExternalLink} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {useToast} from '@/hooks/use-toast';
import {useFirestore} from '@/firebase/provider';
import {collection, doc, updateDoc, deleteDoc, Timestamp} from 'firebase/firestore';
import {useCollection} from '@/firebase/firestore/use-collection';
import {useMemoFirebase} from '@/firebase/firestore/use-memo-firebase';
import {requireAppCheckToken} from '@/lib/admin/app-check';
import type {Comment} from '@/lib/types';
import {format} from 'date-fns';
import Link from 'next/link';

export default function CommentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Comment['status'] | 'all'>('all');

  // Firebase hooks
  const firestore = useFirestore();
  const {toast} = useToast();
  const commentsRef = useMemoFirebase(() => collection(firestore, 'comments'), [firestore]);
  const {data: commentsData, isLoading} = useCollection(commentsRef);

  // Map Firestore data to Comment type
  const comments: Comment[] = useMemo(() => {
    if (!commentsData) return [];
    return commentsData.map((doc): Comment => ({
      id: doc.id,
      postId: doc.postId ?? '',
      postTitle: doc.postTitle,
      authorName: doc.authorName ?? 'Anonymous',
      authorEmail: doc.authorEmail ?? '',
      authorUrl: doc.authorUrl,
      content: doc.content ?? '',
      status: doc.status ?? 'pending',
      parentId: doc.parentId,
      createdAt: doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : new Date(),
      updatedAt: doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate() : undefined,
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [commentsData]);

  const handleApprove = async (commentId: string) => {
    try {
      await requireAppCheckToken();
      await updateDoc(doc(firestore, 'comments', commentId), {
        status: 'approved',
        updatedAt: Timestamp.fromDate(new Date()),
      });

      toast({
        title: 'Comment Approved',
        description: 'The comment has been approved successfully.',
      });
    } catch (error: any) {
      console.error('Failed to approve comment:', error);
      toast({
        title: 'Approval Failed',
        description: error?.message ?? 'Failed to approve comment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (commentId: string, toSpam = true) => {
    try {
      await requireAppCheckToken();
      await updateDoc(doc(firestore, 'comments', commentId), {
        status: toSpam ? 'spam' : 'pending',
        updatedAt: Timestamp.fromDate(new Date()),
      });

      toast({
        title: toSpam ? 'Marked as Spam' : 'Comment Unapproved',
        description: `Comment has been ${toSpam ? 'marked as spam' : 'unapproved'}.`,
      });
    } catch (error: any) {
      console.error('Failed to update comment:', error);
      toast({
        title: 'Update Failed',
        description: error?.message ?? 'Failed to update comment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    try {
      await requireAppCheckToken();
      await deleteDoc(doc(firestore, 'comments', commentId));

      toast({
        title: 'Comment Deleted',
        description: 'The comment has been permanently deleted.',
      });
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
      toast({
        title: 'Delete Failed',
        description: error?.message ?? 'Failed to delete comment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: Comment['status']) => {
    const variants = {
      pending: {variant: 'secondary' as const, label: 'Pending'},
      approved: {variant: 'default' as const, label: 'Approved'},
      spam: {variant: 'destructive' as const, label: 'Spam'},
      trash: {variant: 'outline' as const, label: 'Trash'},
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredComments = comments.filter(comment => {
    const matchesSearch =
      comment.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.authorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.postTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || comment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = comments.filter(c => c.status === 'pending').length;
  const approvedCount = comments.filter(c => c.status === 'approved').length;
  const spamCount = comments.filter(c => c.status === 'spam').length;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header - Mobile First */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Comments</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Moderate and manage user comments
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2 w-fit">
              {pendingCount} Pending Review
            </Badge>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-3 md:p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
        </div>
      </Card>

      {/* Comments List with Tabs */}
      <Card className="overflow-hidden">
        <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v as any)} className="w-full">
          <div className="border-b px-3 md:px-6 pt-4 md:pt-6">
            <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-grid gap-0">
              <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">
                All
                <span className="ml-1 hidden sm:inline">({comments.length})</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm px-2 sm:px-3">
                Pending
                <span className="ml-1 hidden sm:inline">({pendingCount})</span>
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs sm:text-sm px-2 sm:px-3">
                Approved
                <span className="ml-1 hidden sm:inline">({approvedCount})</span>
              </TabsTrigger>
              <TabsTrigger value="spam" className="text-xs sm:text-sm px-2 sm:px-3">
                Spam
                <span className="ml-1 hidden sm:inline">({spamCount})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={statusFilter} className="p-0 mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredComments.length > 0 ? (
              <div className="divide-y">
                {filteredComments.map((comment) => (
                  <div key={comment.id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex gap-3 md:gap-4">
                      <Avatar className="h-8 w-8 md:h-10 md:w-10 shrink-0">
                        <AvatarFallback className="text-xs md:text-sm">
                          {comment.authorName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm md:text-base truncate">
                              {comment.authorName}
                            </p>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {comment.authorEmail}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(comment.createdAt, 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(comment.status)}
                          </div>
                        </div>

                        {/* Post Link */}
                        {comment.postTitle && comment.postId && (
                          <Link
                            href={`/admin/posts/${comment.postId}`}
                            className="text-xs md:text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            On: {comment.postTitle}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}

                        {/* Content */}
                        <p className="text-sm md:text-base whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          {comment.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(comment.id)}
                                className="text-xs md:text-sm"
                              >
                                <Check className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(comment.id, true)}
                                className="text-xs md:text-sm"
                              >
                                <X className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                Spam
                              </Button>
                            </>
                          )}

                          {comment.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(comment.id, false)}
                              className="text-xs md:text-sm"
                            >
                              <X className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                              Unapprove
                            </Button>
                          )}

                          {comment.status === 'spam' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(comment.id)}
                              className="text-xs md:text-sm"
                            >
                              <Check className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                              Not Spam
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive text-xs md:text-sm"
                            onClick={() => handleDelete(comment.id)}
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-base">No comments found</p>
                <p className="text-sm mt-2">
                  {statusFilter === 'all'
                    ? 'Comments will appear here when users submit them'
                    : `No ${statusFilter} comments`}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
