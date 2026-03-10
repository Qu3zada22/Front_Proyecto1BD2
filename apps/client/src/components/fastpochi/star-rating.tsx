import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  maxStars?: number;
  size?: number;
  readOnly?: boolean;
  onRate?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  value,
  maxStars = 5,
  size = 16,
  readOnly = false,
  onRate,
  className,
}: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= value;
        const halfFilled = !filled && starValue - 0.5 <= value;

        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onRate?.(starValue)}
            className={cn(
              "transition-colors",
              !readOnly && "cursor-pointer hover:scale-110",
            )}
          >
            <Star
              size={size}
              className={cn(
                filled
                  ? "fill-amber-400 text-amber-400"
                  : halfFilled
                    ? "fill-amber-400/50 text-amber-400"
                    : "fill-muted text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
