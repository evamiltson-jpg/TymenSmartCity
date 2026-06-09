import React from 'react';
import { getProjectImageUrl } from '../services/projectService';
import { getLocalVoteBonus } from '../services/projectVoteService';
import type { ProjectData } from '../types';
import { ProjectStatusBadge } from './ProjectStatusBadge';

const actionButtonClass =
  'w-full inline-flex justify-center bg-yellow-400/10 hover:bg-yellow-400 text-yellow-400 hover:text-black py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all mt-3';

interface ProjectCardProps {
  project: ProjectData;
  onAction?: () => void;
  actionLabel?: string;
  as?: 'div' | 'button';
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onAction,
  actionLabel = 'Подробнее',
  as = 'div',
}) => {
  const imageMeta = { id: project.id, title: project.title, category: project.category };
  const voteBonus = getLocalVoteBonus(String(project.id));
  const displayVotes = project.votes + voteBonus;
  const ratingLabel = project.rating > 0 ? project.rating.toFixed(1) : String(displayVotes);

  const content = (
    <>
      <div className="h-36 sm:h-40 relative overflow-hidden bg-gray-800">
        <img
          src={getProjectImageUrl(project.imageUrl, imageMeta)}
          className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
          alt={project.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = getProjectImageUrl('', imageMeta);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#122e41] via-[#122e41]/20 to-transparent" />
        <ProjectStatusBadge status={project.status} className="absolute top-3 right-3" />
        <span className="absolute bottom-3 left-4 text-yellow-400 text-xs font-bold uppercase tracking-wide drop-shadow-md">
          {project.category}
        </span>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 group-hover:text-yellow-400 transition-colors line-clamp-2 leading-snug">
          {project.title}
        </h3>

        <p className="text-gray-300 text-sm leading-relaxed mb-2 line-clamp-3 flex-grow">{project.desc}</p>

        <p className="text-base font-bold text-yellow-400/90 mb-3 truncate">{project.team}</p>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="bg-white/10 text-gray-200 px-2.5 py-1 rounded-md text-xs font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs sm:text-sm font-semibold">
          <span className="text-gray-400 truncate mr-2">{displayVotes} голосов</span>
          <span className="text-yellow-400 shrink-0 flex items-center gap-1">
            <span className="text-base leading-none">★</span>
            <span>{ratingLabel}</span>
          </span>
        </div>

        {onAction && as === 'div' && (
          <button type="button" onClick={onAction} className={actionButtonClass}>
            {actionLabel}
          </button>
        )}
      </div>
    </>
  );

  const cardClass =
    'bg-[#122e41] rounded-2xl overflow-hidden border border-white/5 hover:border-yellow-400/30 transition-all group flex flex-col shadow-lg hover:shadow-yellow-400/5 text-left w-full';

  if (as === 'button') {
    return (
      <button type="button" onClick={onAction} className={cardClass}>
        {content}
      </button>
    );
  }

  return <div className={cardClass}>{content}</div>;
};
