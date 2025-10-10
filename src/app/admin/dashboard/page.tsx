import { reviews } from "@/lib/data";
import FeedbackManager from "@/components/admin/feedback-manager";

export default function AdminDashboard() {
  const pendingFeedback = reviews.filter((r) => r.status === "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Review, approve, and manage user feedback.
        </p>
      </div>
      <FeedbackManager initialFeedback={pendingFeedback} />
    </div>
  );
}
