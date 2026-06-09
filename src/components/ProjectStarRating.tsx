import React, { useState } from 'react';

interface ProjectStarRatingProps {
  value: number | null;
  average: number;
  reviewCount: number;
  disabled?: boolean;
  onRate: (stars: number) => void;
}

export const ProjectStarRating: React.FC<ProjectStarRatingProps> = ({
  value,
  average,
  reviewCount,
  disabled,
  onRate,
}) => {
  const [hover, setHover] = useState<number | null>(null);

  const display = hover ?? value ?? 0;
  const averageLabel = average > 0 ? average.toFixed(1) : '—';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHover(null)}
          role="group"
          aria-label="Оценка проекта"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onMouseEnter={() => !disabled && setHover(star)}
              onClick={() => !disabled && onRate(star)}
              className={`text-2xl leading-none transition-transform ${
                disabled ? 'cursor-default opacity-60' : 'cursor-pointer hover:scale-110'
              } ${star <= display ? 'text-yellow-400' : 'text-gray-600'}`}
              aria-label={`${star} из 5`}
            >
              ★
            </button>
          ))}
        </div>
        <div className="text-sm">
          <span className="text-yellow-400 font-bold">{averageLabel}</span>
          <span className="text-gray-500 ml-1">· {reviewCount} оценок</span>
        </div>
      </div>
      {value != null && (
        <p className="text-xs text-gray-400">Ваша оценка: {value} из 5</p>
      )}
    </div>
  );
};
