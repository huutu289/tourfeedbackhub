import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  pageCount,
  onPageChange,
}: PaginationControlsProps) {
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < pageCount;

  const handlePrev = () => {
    if (canGoBack) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>
        Page {pageCount === 0 ? 0 : currentPage} of {pageCount}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!canGoForward}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

