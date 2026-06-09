import React, { useEffect, useState } from 'react';
import type { ProjectData } from '../types';
import { getProjectImageUrl } from '../services/projectService';
import {
  getLocalVoteBonus,
  getRemainingVotesToday,
  hasVotedToday,
  voteForProject,
} from '../services/projectVoteService';
import { ProjectStatusBadge } from './ProjectStatusBadge';

interface ProjectDetailContentProps {
  project: ProjectData;
  onApply?: () => void;
  onVoted?: () => void;
}

export const ProjectDetailContent: React.FC<ProjectDetailContentProps> = ({
  project,
  onApply,
  onVoted,
}) => {
  const imageMeta = { id: project.id, title: project.title, category: project.category };
  const isApplyVisible = ['В разработке', 'Тестирование', 'Готов к внедрению', 'Идея'].includes(project.status);
  const ratingLabel = project.rating > 0 ? project.rating.toFixed(1) : '—';

  const [votes, setVotes] = useState(project.votes + getLocalVoteBonus(String(project.id)));
  const [voted, setVoted] = useState(hasVotedToday(String(project.id)));
  const [remaining, setRemaining] = useState(getRemainingVotesToday());
  const [voteMessage, setVoteMessage] = useState('');
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    setVotes(project.votes + getLocalVoteBonus(String(project.id)));
    setVoted(hasVotedToday(String(project.id)));
    setRemaining(getRemainingVotesToday());
  }, [project.id, project.votes]);

  const handleVote = async () => {
    setVoting(true);
    setVoteMessage('');
    const result = await voteForProject(String(project.id));
    setVoting(false);
    setVoteMessage(result.message);
    if (result.ok) {
      const newVotes = votes + 1;
      setVotes(newVotes);
      setVoted(true);
      setRemaining(getRemainingVotesToday());
      onVoted?.();
    }
  };

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
        <div className="shrink-0 w-full sm:w-44 h-40 sm:h-44 rounded-xl overflow-hidden bg-gray-800">
          <img
            src={getProjectImageUrl(project.imageUrl, imageMeta)}
            alt={project.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getProjectImageUrl('', imageMeta);
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-yellow-400 text-xs font-bold uppercase tracking-wide">{project.category}</span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 mb-2 leading-tight">{project.title}</h2>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <ProjectStatusBadge status={project.status} />
            <span className="text-gray-400 text-sm">{project.participants} участников</span>
          </div>

          <p className="text-sm text-gray-400 mb-1">Команда</p>
          <p className="text-lg sm:text-xl font-bold text-yellow-400 mb-3">{project.team}</p>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 bg-yellow-400/10 text-yellow-400 px-3 py-1.5 rounded-lg text-sm font-bold">
              ★ {ratingLabel}
              <span className="text-yellow-400/70 font-normal">/ 5.0</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/5 text-gray-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
              🗳 {votes} голосов
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

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleVote}
          disabled={voting || voted || remaining <= 0}
          className="bg-sky-500 hover:bg-sky-400 disabled:bg-white/10 disabled:text-gray-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-colors"
        >
          {voted ? 'Вы проголосовали' : voting ? 'Отправка...' : 'Проголосовать'}
        </button>
        <span className="text-xs text-gray-500">
          {remaining > 0 ? `Осталось голосов сегодня: ${remaining} из 5` : 'Лимит на сегодня исчерпан'}
        </span>
      </div>

      {voteMessage && <p className="text-sm text-gray-300">{voteMessage}</p>}

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
