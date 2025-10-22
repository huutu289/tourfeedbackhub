'use client';

import {useEffect, useState} from 'react';
import {collection, getCountFromServer, query, where} from 'firebase/firestore';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {useFirestore} from '@/firebase/provider';
import {FileText, MessageSquare, Users, Eye} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{className?: string}>;
}

function StatCard({title, value, icon: Icon}: StatCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const firestore = useFirestore();
  const [stats, setStats] = useState<StatCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!firestore) return;
      setIsLoading(true);
      setHasError(false);

      try {
        const [postsSnap, feedbackSnap, usersSnap, reviewsSnap] = await Promise.all([
          getCountFromServer(query(collection(firestore, 'posts'), where('status', '==', 'published'))),
          getCountFromServer(query(collection(firestore, 'feedback'), where('status', '==', 'pending'))),
          getCountFromServer(collection(firestore, 'users')),
          getCountFromServer(query(collection(firestore, 'reviews'), where('status', '==', 'approved'))),
        ]);

        if (!isMounted) return;

        setStats([
          {title: 'Published Posts', value: postsSnap.data().count ?? 0, icon: FileText},
          {title: 'Pending Feedback', value: feedbackSnap.data().count ?? 0, icon: MessageSquare},
          {title: 'Registered Users', value: usersSnap.data().count ?? 0, icon: Users},
          {title: 'Approved Reviews', value: reviewsSnap.data().count ?? 0, icon: Eye},
        ]);
      } catch (error) {
        console.error('Failed to load dashboard stats', error);
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [firestore]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({length: 4}).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <Card className="border-destructive bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Unable to load dashboard stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t retrieve the latest metrics from Firestore. Please refresh the page or try again
            later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
