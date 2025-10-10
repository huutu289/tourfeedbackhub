"use client";

import { useState } from "react";
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
import { type Review } from "@/lib/types";
import { approveReview, rejectReview, summarizeReview } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "../ui/separator";

type FeedbackManagerProps = {
  initialFeedback: Review[];
};

export default function FeedbackManager({ initialFeedback }: FeedbackManagerProps) {
  const [feedbackItems, setFeedbackItems] = useState<Review[]>(initialFeedback);
  const [selectedFeedback, setSelectedFeedback] = useState<Review | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [summary, setSummary] = useState<{ content: string; language: string } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { toast } = useToast();

  const openDetails = (feedback: Review) => {
    setSelectedFeedback(feedback);
    setSummary(null);
    setIsSummarizing(false);
    setIsDialogOpen(true);
  };

  const handleApprove = async (id: string) => {
    const result = await approveReview(id);
    if (result.success) {
      setFeedbackItems(feedbackItems.filter((item) => item.id !== id));
      toast({
        title: "Feedback Approved",
        description: "The feedback is now public.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    const result = await rejectReview(id);
    if (result.success) {
      setFeedbackItems(feedbackItems.filter((item) => item.id !== id));
      toast({
        title: "Feedback Rejected",
        description: "The feedback has been removed.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };
  
  const handleSummarize = async () => {
    if (!selectedFeedback) return;
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeReview(selectedFeedback.message);
      setSummary({ content: result.summary, language: result.language });
    } catch (error) {
      toast({
        title: "Summarization Failed",
        description: "Could not generate summary. Please try again.",
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
                {feedbackItems.length > 0 ? (
                    feedbackItems.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.country}</div>
                        </TableCell>
                        <TableCell>{item.tourName}</TableCell>
                        <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                                {item.rating} <Star className="w-4 h-4 text-yellow-400" />
                            </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.message}</TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetails(item)}>
                            Details
                        </Button>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700" onClick={() => handleApprove(item.id)}>
                            <CheckCircle className="w-4 h-4 mr-1"/> Approve
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleReject(item.id)}>
                            <XCircle className="w-4 h-4 mr-1"/> Reject
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
                Reviewing feedback from {selectedFeedback.name} for the {selectedFeedback.tourName} tour.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-4 items-center gap-4">
                    <div className="col-span-1 text-sm text-muted-foreground">User</div>
                    <div className="col-span-3 font-semibold">{selectedFeedback.name}, {selectedFeedback.country}</div>
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
                {selectedFeedback.photoUrl && (
                     <div className="grid grid-cols-4 items-start gap-4">
                        <div className="col-span-1 text-sm text-muted-foreground pt-1">Photo</div>
                        <div className="col-span-3">
                            <Image src={selectedFeedback.photoUrl} alt="User submitted photo" width={200} height={150} className="rounded-md object-cover" />
                        </div>
                    </div>
                )}
                <Separator className="my-2"/>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent"/> AI Analysis</h3>
                         <Button onClick={handleSummarize} disabled={isSummarizing} size="sm">
                            {isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {summary ? "Regenerate" : "Generate Summary"}
                         </Button>
                    </div>
                    {isSummarizing && <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-accent"/></div>}
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
