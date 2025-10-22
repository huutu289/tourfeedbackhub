'use client';

import {useState} from 'react';
import {MessageSquare, Send, ThumbsUp, Flag, Reply} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Card} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import type {Comment} from '@/lib/types';
import {format, formatDistanceToNow} from 'date-fns';

interface CommentsSectionProps {
  postId: string;
  postType: 'post' | 'page';
  allowComments?: boolean;
}

export function CommentsSection({postId, postType, allowComments = true}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();

    if (!newComment.trim() || !authorName.trim() || !authorEmail.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const commentData: Partial<Comment> = {
        postId,
        postType,
        authorName,
        authorEmail,
        content: newComment,
        status: 'pending', // Requires moderation
        parentId: parentId || null,
        createdAt: new Date(),
      };

      // TODO: Save to Firestore
      console.log('Submitting comment:', commentData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset form
      setNewComment('');
      if (!parentId) {
        setAuthorName('');
        setAuthorEmail('');
      }
      setReplyingTo(null);

      // Show success message
      alert('Comment submitted! It will appear after moderation.');
    } finally {
      setSubmitting(false);
    }
  };

  const CommentItem = ({comment, depth = 0}: {comment: Comment; depth?: number}) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    return (
      <div className={`${depth > 0 ? 'ml-8 mt-4' : ''}`}>
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback>
              {comment.authorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-sm">{comment.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(comment.createdAt, {addSuffix: true})}
                  </p>
                </div>
                {comment.status === 'pending' && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Pending
                  </span>
                )}
              </div>

              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>

            <div className="flex items-center gap-4 mt-2 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>

              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <ThumbsUp className="h-3 w-3 mr-1" />
                Like
              </Button>

              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                <Flag className="h-3 w-3 mr-1" />
                Report
              </Button>
            </div>

            {showReplyForm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Handle reply submission
                  setShowReplyForm(false);
                  setReplyContent('');
                }}
                className="mt-3 ml-2"
              >
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <Button type="submit" size="sm" disabled={!replyContent.trim()}>
                    Reply
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Render nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4">
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!allowComments) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Comments are disabled for this post</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="text-xl font-semibold">
          {comments.length} Comment{comments.length !== 1 ? 's' : ''}
        </h3>
      </div>

      {/* Comment Form */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Leave a Comment</h4>
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Your Name *"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Your Email *"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <Textarea
            placeholder="Write your comment... *"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            required
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Your comment will be posted after moderation
            </p>
            <Button type="submit" disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Submitting...' : 'Post Comment'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-6">
          {comments
            .filter(comment => !comment.parentId) // Only top-level comments
            .map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        </Card>
      )}
    </div>
  );
}
