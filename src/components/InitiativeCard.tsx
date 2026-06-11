import React, { useState } from 'react';
import {
  INITIATIVE_STATUS_COLORS,
  INITIATIVE_STATUS_LABELS,
} from '../constants/initiatives';
import type { CitizenInitiative } from '../services/initiativeService';
import { ProjectStarRating } from './ProjectStarRating';

interface InitiativeCardProps {
  initiative: CitizenInitiative;
  isOwn?: boolean;
  canVote?: boolean;
  voting?: boolean;
  onVote?: (score: number) => void;
  compact?: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

export const InitiativeCard: React.FC<InitiativeCardProps> = ({
  initiative,
  isOwn,
  canVote,
  voting,
  onVote,
  compact,
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusClass = INITIATIVE_STATUS_COLORS[initiative.status];
  const statusLabel = INITIATIVE_STATUS_LABELS[initiative.status];
  const desc =
    initiative.description.length > 160 && !expanded
      ? `${initiative.description.slice(0, 160)}…`
      : initiative.description;

  return (
    <article className="bg-[#122e41] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col h-full shadow-lg hover:border-white/20 transition-colors">
      {initiative.photo_urls?.[0] && (
        <div className={`relative ${compact ? 'h-36' : 'h-44 sm:h-48'} bg-[#0b2234] overflow-hidden`}>
          <img
            src={initiative.photo_urls[0]}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {initiative.photo_urls.length > 1 && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold">
              +{initiative.photo_urls.length - 1} фото
            </span>
          )}
        </div>
      )}

      <div className="p-4 sm:p-5 flex flex-col flex-1 gap-3">
        <div className="flex flex-wrap items-start gap-2 justify-between">
          <span className="px-2.5 py-1 rounded-lg bg-white/5 text-yellow-400 text-[10px] font-black uppercase tracking-wider">
            {initiative.category}
          </span>
          <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2">
          {initiative.title}
        </h3>

        <p className="text-gray-400 text-sm leading-relaxed flex-1">
          {desc}
          {initiative.description.length > 160 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 text-yellow-400 hover:underline text-xs font-bold"
            >
              {expanded ? 'Свернуть' : 'Ещё'}
            </button>
          )}
        </p>

        {initiative.address && (
          <p className="text-xs text-gray-500 flex items-start gap-1.5">
            <span className="shrink-0">📍</span>
            <span className="line-clamp-2">{initiative.address}</span>
          </p>
        )}

        <div className="pt-2 border-t border-white/5 space-y-3">
          {!compact && onVote && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">
                Насколько это необходимо?
              </p>
              <ProjectStarRating
                value={initiative.user_vote ?? null}
                average={Number(initiative.importance_rating) || 0}
                reviewCount={initiative.importance_votes}
                disabled={!canVote || voting || isOwn}
                onRate={onVote}
              />
              {!canVote && !isOwn && (
                <p className="text-[11px] text-gray-500 mt-1">Войдите, чтобы оценить</p>
              )}
              {isOwn && (
                <p className="text-[11px] text-gray-500 mt-1">Нельзя оценить свою инициативу</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>{formatDate(initiative.created_at)}</span>
            {compact && (
              <span>
                <span className="text-yellow-400 font-bold">
                  {Number(initiative.importance_rating) > 0
                    ? Number(initiative.importance_rating).toFixed(1)
                    : '—'}
                </span>
                {' · '}
                {initiative.importance_votes} оценок
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
