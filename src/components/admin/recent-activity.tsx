'use client';

import {useMemo} from 'react';
import {formatDistanceToNow} from 'date-fns';
import {collection, limit, orderBy, query, type Timestamp} from 'firebase/firestore';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {useFirestore} from '@/firebase/provider';
import {useMemoFirebase} from '@/firebase/firestore/use-memo-firebase';
import {useCollection} from '@/firebase/firestore/use-collection';
import {
  CheckCircle2,
  Edit,
  FileText,
  MessageSquare,
  User,
  XCircle,
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'post' | 'comment' | 'user' | 'approval' | 'rejection' | 'edit';
  title: string;
  description: string;
  user: string;
  timestamp: Date;
}

const activityIcons = {
  post: FileText,
  comment: MessageSquare,
  user: User,
  approval: CheckCircle2,
  rejection: XCircle,
  edit: Edit,
};

const activityColors = {
  post: 'text-blue-600 bg-blue-100',
  comment: 'text-green-600 bg-green-100',
  user: 'text-purple-600 bg-purple-100',
  approval: 'text-emerald-600 bg-emerald-100',
  rejection: 'text-red-600 bg-red-100',
  edit: 'text-orange-600 bg-orange-100',
};

function toDate(value: Timestamp | Date | string | number | undefined | null): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }
  if ('toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return new Date(0);
}

export function RecentActivity() {
  const firestore = useFirestore();

  const postsQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, 'posts'),
        orderBy('updatedAt', 'desc'),
        limit(10)
      ),
    [firestore]
  );

  const feedbackQuery = useMemoFirebase(
    () =>
      query(collection(firestore, 'feedback'), orderBy('submittedAt', 'desc'), limit(10)),
    [firestore]
  );

  const reviewsQuery = useMemoFirebase(
    () =>
      query(collection(firestore, 'reviews'), orderBy('createdAt', 'desc'), limit(10)),
    [firestore]
  );

  const {data: postsData, isLoading: postsLoading} = useCollection(postsQuery);
  const {data: feedbackData, isLoading: feedbackLoading} = useCollection(feedbackQuery);
  const {data: reviewsData, isLoading: reviewsLoading} = useCollection(reviewsQuery);

  const isLoading = postsLoading || feedbackLoading || reviewsLoading;

  const activities = useMemo<Activity[]>(() => {
    const postActivities =
      postsData?.map((doc) => {
        const title = doc.title ?? 'Untitled post';
        const status = (doc.status as string | undefined) ?? 'draft';
        const timestamp = toDate(doc.updatedAt ?? doc.createdAt);
        return {
          id: `post-${doc.id}`,
          type: status === 'published' ? 'post' : 'edit',
          title: status === 'published' ? 'Post published' : 'Post updated',
          description: `"${title}" (${status})`,
          user: doc.authorName ?? 'Unknown author',
          timestamp,
        } satisfies Activity;
      }) ?? [];

    const feedbackActivities =
      feedbackData?.map((doc) => {
        const status = (doc.status as string | undefined) ?? 'pending';
        const timestamp = toDate(doc.submittedAt ?? doc.createdAt);
        let type: Activity['type'] = 'comment';
        let title = 'Feedback submitted';

        if (status === 'approved') {
          type = 'approval';
          title = 'Feedback approved';
        } else if (status === 'rejected') {
          type = 'rejection';
          title = 'Feedback rejected';
        }

        return {
          id: `feedback-${doc.id}`,
          type,
          title,
          description: doc.tourName
            ? `"${doc.tourName}" • ${doc.authorDisplay ?? doc.name ?? 'Anonymous'}`
            : doc.authorDisplay ?? doc.name ?? 'Anonymous feedback',
          user: doc.reviewerName ?? doc.authorDisplay ?? 'Traveller',
          timestamp,
        } satisfies Activity;
      }) ?? [];

    const reviewActivities =
      reviewsData?.map((doc) => {
        const status = (doc.status as string | undefined) ?? 'pending';
        const timestamp = toDate(doc.createdAt ?? doc.publishedAt);
        let type: Activity['type'] = 'comment';
        let title = 'Review submitted';

        if (status === 'approved') {
          type = 'approval';
          title = 'Review approved';
        } else if (status === 'rejected') {
          type = 'rejection';
          title = 'Review rejected';
        }

        return {
          id: `review-${doc.id}`,
          type,
          title,
          description: doc.tourName
            ? `"${doc.tourName}" • ${doc.authorDisplay ?? doc.name ?? 'Anonymous'}`
            : doc.authorDisplay ?? doc.name ?? 'Anonymous review',
          user: doc.moderatedBy ?? 'System',
          timestamp,
        } satisfies Activity;
      }) ?? [];

    return [...postActivities, ...feedbackActivities, ...reviewActivities]
      .filter((activity) => activity.timestamp instanceof Date)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }, [postsData, feedbackData, reviewsData]);

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({length: 5}).map((_, index) => (
              <div key={index} className="-mx-4 flex items-start gap-4 rounded-lg px-4 py-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No recent activity to display yet.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type];
              const colorClass = activityColors[activity.type];

              return (
                <div
                  key={activity.id}
                  className="-mx-4 flex items-start gap-4 rounded-lg px-4 py-2 transition-colors hover:bg-muted/30"
                >
                  <div className={`rounded-full p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{activity.user}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(activity.timestamp, {addSuffix: true})}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
