"use client";

import { useMemo, useState } from "react";
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, Loader2, CheckCircle, XCircle } from "lucide-react";
import { type Feedback } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "../ui/separator";
import { useFirestore } from "@/firebase/provider";
import { collection, orderBy, query, where, Timestamp } from "firebase/firestore";
import { useMemoFirebase } from "@/firebase/firestore/use-memo-firebase";
import { useCollection, type WithId } from "@/firebase/firestore/use-collection";
import { approveFeedback, rejectFeedback } from "@/lib/cloud-functions-client";

async function summarizeMessage(message: string) {
  const response = await fetch('/api/admin/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to summarise feedback');
  }
  return response.json() as Promise<{ summary: string; language: string }>;
}

function mapFeedback(doc: WithId<any>): Feedback {
  const submittedAt = doc.submittedAt instanceof Timestamp ? doc.submittedAt.toDate() : new Date();
  const createdAt = doc.createdAt instanceof Timestamp ? doc.createdAt.toDate() : submittedAt;
  return {
    id: doc.id,
    authorDisplay: doc.authorDisplay ?? doc.name ?? 'Anonymous',
    country: doc.country ?? '',
    language: doc.language ?? 'en',
    rating: doc.rating ?? 0,
    message: doc.message ?? '',
    tourId: doc.tourId ?? undefined,
    tourName: doc.tourName ?? doc.tour ?? undefined,
    photoUrls: Array.isArray(doc.photoUrls) ? doc.photoUrls : undefined,
    status: doc.status ?? 'pending',
    createdAt,
    submittedAt,
    attachments: doc.attachments,
  };
}

export default function FeedbackManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [summary, setSummary] = useState<{ content: string; language: string } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const pendingQuery = useMemoFirebase(
    () =>
      query(
        collection(firestore, 'feedback'),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc')
      ),
    [firestore]
  );

  const { data, isLoading } = useCollection(pendingQuery);

  const feedbackItems = useMemo(() => {
    if (!data) return [];
    return data.map(mapFeedback);
  }, [data]);

  const openDetails = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setSummary(null);
    setIsSummarizing(false);
    setIsDialogOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      setIsActing(true);
      await approveFeedback(id);
      toast({
        title: "Feedback Approved",
        description: "The feedback is now public.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to approve feedback.',
        variant: "destructive",
      });
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setIsActing(true);
      await rejectFeedback(id);
      toast({
        title: "Feedback Rejected",
        description: "The feedback has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to reject feedback.',
        variant: "destructive",
      });
    } finally {
      setIsActing(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedFeedback) return;
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeMessage(selectedFeedback.message);
      setSummary({ content: result.summary, language: result.language });
    } catch (error) {
      toast({
        title: "Summarization Failed",
        description: error instanceof Error ? error.message : 'Could not generate summary. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                  </TableCell>
                </TableRow>
              ) : feedbackItems.length > 0 ? (
                feedbackItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.authorDisplay}</div>
                      <div className="text-sm text-muted-foreground">{item.country}</div>
                    </TableCell>
                    <TableCell>{item.tourName ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.rating} <Star className="w-4 h-4 text-yellow-400" />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{item.message}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openDetails(item)}>
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleApprove(item.id)}
                        disabled={isActing}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleReject(item.id)}
                        disabled={isActing}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No pending feedback. Great job!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedFeedback && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Feedback Details</DialogTitle>
              <DialogDescription>
                Reviewing feedback from {selectedFeedback.authorDisplay} for the {selectedFeedback.tourName ?? 'tour'}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-1 text-sm text-muted-foreground">Visitor</div>
                <div className="col-span-3 font-semibold">{selectedFeedback.authorDisplay}, {selectedFeedback.country}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-1 text-sm text-muted-foreground">Rating</div>
                <div className="col-span-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < selectedFeedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <div className="col-span-1 text-sm text-muted-foreground pt-1">Message</div>
                <p className="col-span-3 text-sm bg-secondary/50 p-3 rounded-md">{selectedFeedback.message}</p>
              </div>
              {selectedFeedback.photoUrls?.length ? (
                <div className="grid grid-cols-4 items-start gap-4">
                  <div className="col-span-1 text-sm text-muted-foreground pt-1">Photos</div>
                  <div className="col-span-3 flex flex-wrap gap-3">
                    {selectedFeedback.photoUrls.map((url) => (
                      <Image key={url} src={url} alt="User submitted" width={160} height={120} className="rounded-md object-cover" />
                    ))}
                  </div>
                </div>
              ) : null}
              <Separator className="my-2" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> AI Analysis</h3>
                  <Button onClick={handleSummarize} disabled={isSummarizing} size="sm">
                    {isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {summary ? "Regenerate" : "Generate Summary"}
                  </Button>
                </div>
                {isSummarizing && <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>}
                {summary && (
                  <div className="space-y-3 bg-secondary/50 p-4 rounded-lg">
                    <div>
                      <h4 className="font-semibold">Summary</h4>
                      <p className="text-sm text-muted-foreground">{summary.content}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Language</h4>
                      <Badge variant="outline">{summary.language}</Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
