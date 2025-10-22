'use client';

import {useEffect, useMemo, useState} from 'react';
import {
  TrendingUp,
  Users,
  Eye,
  FileText,
  Calendar,
  Download,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {Progress} from '@/components/ui/progress';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Skeleton} from '@/components/ui/skeleton';
import type {AnalyticsData} from '@/lib/types';
import {useFirestore} from '@/firebase/provider';
import {collection, doc, getCountFromServer, getDoc, query, where} from 'firebase/firestore';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7days');

  // Mock analytics data - replace with real data from Firebase Analytics or custom tracking
  const mockAnalytics: AnalyticsData = {
    pageViews: 12456,
    uniqueVisitors: 3892,
    topPosts: [
      {postId: '1', title: 'Getting Started with Next.js', views: 1234},
      {postId: '2', title: 'WordPress vs Custom CMS', views: 987},
      {postId: '3', title: 'SEO Best Practices 2025', views: 756},
      {postId: '4', title: 'Firebase Integration Guide', views: 543},
      {postId: '5', title: 'React Server Components', views: 432},
    ],
    topPages: [
      {url: '/', views: 5234},
      {url: '/about', views: 2134},
      {url: '/feedback', views: 1543},
      {url: '/reviews', views: 1234},
      {url: '/tours', views: 987},
    ],
    referrers: [
      {source: 'google.com', count: 1543},
      {source: 'facebook.com', count: 876},
      {source: 'twitter.com', count: 543},
      {source: 'linkedin.com', count: 321},
      {source: 'direct', count: 2109},
    ],
    devices: {
      mobile: 5234,
      desktop: 6123,
      tablet: 1099,
    },
    period: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {trendValue && (
          <p className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'} mt-1`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue} from last period
          </p>
        )}
      </CardContent>
    </Card>
  );

  const totalDevices =
    mockAnalytics.devices.mobile + mockAnalytics.devices.desktop + mockAnalytics.devices.tablet;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your site's performance and visitor behavior
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Page Views"
          value={mockAnalytics.pageViews}
          icon={Eye}
          trend="up"
          trendValue="12.5%"
        />
        <StatCard
          title="Unique Visitors"
          value={mockAnalytics.uniqueVisitors}
          icon={Users}
          trend="up"
          trendValue="8.3%"
        />
        <StatCard
          title="Published Posts"
          value={24}
          icon={FileText}
          trend="up"
          trendValue="3 new"
        />
        <StatCard
          title="Avg. Session Duration"
          value="3m 42s"
          icon={Calendar}
          trend="down"
          trendValue="5.2%"
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAnalytics.topPages.map((page, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{page.url}</TableCell>
                        <TableCell className="text-right">{page.views.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockAnalytics.referrers.map((referrer, index) => {
                  const total = mockAnalytics.referrers.reduce((sum, r) => sum + r.count, 0);
                  const percentage = (referrer.count / total) * 100;

                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{referrer.source}</span>
                        <span className="text-sm text-muted-foreground">
                          {referrer.count.toLocaleString()} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Engagement Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAnalytics.topPosts.map((post) => (
                    <TableRow key={post.postId}>
                      <TableCell className="font-medium">{post.title}</TableCell>
                      <TableCell className="text-right">{post.views.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {Math.floor(Math.random() * 30 + 50)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Referrer Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Bounce Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAnalytics.referrers.map((referrer, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{referrer.source}</TableCell>
                        <TableCell className="text-right">
                          {referrer.count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.floor(Math.random() * 30 + 35)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <p>Geographic data visualization</p>
                  <p className="text-sm mt-2">Integrate with Google Analytics for detailed data</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desktop</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockAnalytics.devices.desktop.toLocaleString()}
                </div>
                <Progress
                  value={(mockAnalytics.devices.desktop / totalDevices) * 100}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {((mockAnalytics.devices.desktop / totalDevices) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mobile</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockAnalytics.devices.mobile.toLocaleString()}
                </div>
                <Progress
                  value={(mockAnalytics.devices.mobile / totalDevices) * 100}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {((mockAnalytics.devices.mobile / totalDevices) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tablet</CardTitle>
                <Tablet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockAnalytics.devices.tablet.toLocaleString()}
                </div>
                <Progress
                  value={(mockAnalytics.devices.tablet / totalDevices) * 100}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {((mockAnalytics.devices.tablet / totalDevices) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
