import FeedbackManager from "@/components/admin/feedback-manager";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { RecentActivity } from "@/components/admin/recent-activity";
import { QuickActions } from "@/components/admin/quick-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s what&apos;s happening with your site today.
          </p>
        </div>
        <div className="text-sm text-muted-foreground mobile-hide">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Stats Overview */}
      <DashboardStats />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Recent Activity - Takes 3 columns */}
        <RecentActivity />

        {/* Quick Actions - Takes 1 column */}
        <QuickActions />
      </div>

      {/* Feedback Manager */}
      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback">Feedback Manager</TabsTrigger>
          <TabsTrigger value="reviews">Recent Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <FeedbackManager />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No recent reviews to display.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
