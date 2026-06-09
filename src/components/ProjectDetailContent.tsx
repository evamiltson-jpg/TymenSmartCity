import React from 'react';
import type { ProjectData } from '../types';
import { getProjectImageUrl } from '../services/projectService';
import { ProjectStatusBadge } from './ProjectStatusBadge';

interface ProjectDetailContentProps {
  project: ProjectData;
  onApply?: () => void;
  rank?: number;
}

const rankStyles: Record<number, string> = {
  1: 'bg-yellow-400 text-black',
  2: 'bg-gray-300 text-black',
  3: 'bg-amber-700 text-white',
};

export const ProjectDetailContent: React.FC<ProjectDetailContentProps> = ({ project, onApply, rank }) => {
  const isApplyVisible = ['В разработке', 'Тестирование', 'Готов к внедрению', 'Идея'].includes(project.status);
  const ratingLabel = project.rating > 0 ? project.rating.toFixed(1) : '—';

  const handleApply = () => {
    if (onApply) {
      onApply();
      return;
    }
    alert(`Спасибо! Ваша заявка на участие в проекте «${project.title}» отправлена куратору.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        <div className="relative shrink-0 w-full sm:w-44 h-40 sm:h-44 rounded-xl overflow-hidden bg-gray-800">
          <img
            src={getProjectImageUrl(project.imageUrl)}
            alt={project.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = getProjectImageUrl(project.imageUrl || '');
            }}
          />
          {rank != null && rank <= 8 && (
            <span
              className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-black ${
                rankStyles[rank] ?? 'bg-black/60 text-white'
              }`}
            >
              #{rank}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-yellow-400 text-xs font-bold uppercase tracking-wide">{project.category}</span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 mb-3 leading-tight">{project.title}</h2>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <ProjectStatusBadge status={project.status} />
            <span className="text-xs text-gray-400">
              {project.team} · {project.participants} уч.
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 bg-yellow-400/10 text-yellow-400 px-3 py-1.5 rounded-lg text-sm font-bold">
              ★ {ratingLabel}
              <span className="text-yellow-400/70 font-normal">/ 5.0</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/5 text-gray-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
              🗳 {project.votes} голосов
            </span>
          </div>
        </div>
      </div>

      <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{project.desc}</p>

      {project.tags.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Технологии</p>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="bg-white/10 text-gray-100 px-3 py-1.5 rounded-lg text-sm font-semibold border border-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {isApplyVisible && (
        <button
          type="button"
          onClick={handleApply}
          className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2.5 px-6 rounded-xl text-sm transition-colors"
        >
          Подать заявку
        </button>
      )}
    </div>
  );
};
