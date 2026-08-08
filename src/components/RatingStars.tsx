import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
  count?: number;
}

export default function RatingStars({ rating, size = 16, showNumber = false, count }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(rating);
          return (
            <Star
              key={star}
              size={size}
              className={filled ? 'text-secondary-400 fill-secondary-400' : 'text-slate-200 fill-slate-200'}
            />
          );
        })}
      </div>
      {showNumber && (
        <span className="text-xs font-medium text-slate-600">
          {rating > 0 ? rating.toFixed(1) : 'New'}
          {count != null && count > 0 && ` (${count})`}
        </span>
      )}
    </div>
  );
}
