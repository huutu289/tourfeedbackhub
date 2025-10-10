"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  setRating: (rating: number) => void;
  className?: string;
}

export function StarRating({ rating, setRating, className }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          onClick={() => setRating(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className="cursor-pointer"
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={cn(
              "h-8 w-8 transition-colors",
              (hoverRating || rating) >= star
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}
