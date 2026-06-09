import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ProjectData } from '../types';
import { getProjectImageUrl } from '../services/projectService';
import {
  APPLICATION_STATUS_LABELS,
  cancelProjectApplication,
  fetchApplicationForProject,
  submitProjectApplication,
  type ProjectApplication,
} from '../services/projectApplicationService';
import {
  computeDisplayProjectStats,
  getRemainingRatingsToday,
  getUserStarRating,
  rateProject,
} from '../services/projectRatingService';
import { ProjectStarRating } from './ProjectStarRating';
import { ProjectStatusBadge } from './ProjectStatusBadge';

interface ProjectDetailContentProps {
  project: ProjectData;
  onApplySuccess?: () => void;
  onRated?: () => void;
  onNavigate?: (page: string) => void;
}

export const ProjectDetailContent: React.FC<ProjectDetailContentProps> = ({
  project,
  onApplySuccess,
  onRated,
  onNavigate,
}) => {
  const { user, isAuthenticated } = useAuth();
  const imageMeta = { id: project.id, title: project.title, category: project.category };
  const isApplyVisible = ['В разработке', 'Тестирование', 'Готов к внедрению', 'Идея'].includes(
    project.status,
  );

  const [stats, setStats] = useState(() => computeDisplayProjectStats(project));
  const [userStars, setUserStars] = useState<number | null>(() => getUserStarRating(String(project.id)));
  const [remaining, setRemaining] = useState(getRemainingRatingsToday());
  const [ratingMessage, setRatingMessage] = useState('');
  const [ratingBusy, setRatingBusy] = useState(false);

  const [application, setApplication] = useState<ProjectApplication | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyBusy, setApplyBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  useEffect(() => {
    setStats(computeDisplayProjectStats(project));
    setUserStars(getUserStarRating(String(project.id)));
    setRemaining(getRemainingRatingsToday());
  }, [project]);

  useEffect(() => {
    if (!user) {
      setApplication(null);
      return;
    }
    fetchApplicationForProject(user.id, String(project.id), project.title)
      .then(setApplication)
      .catch(() => setApplication(null));
  }, [user, project.id]);

  const handleRate = async (stars: number) => {
    setRatingBusy(true);
    setRatingMessage('');
    const result = await rateProject(project, stars);
    setRatingBusy(false);
    setRatingMessage(result.message);
    if (result.ok) {
      setUserStars(stars);
      setStats(computeDisplayProjectStats(project));
      setRemaining(getRemainingRatingsToday());
      onRated?.();
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated || !user) {
      setApplyMessage('Войдите в аккаунт, чтобы подать заявку.');
      onNavigate?.('login');
      return;
    }

    setApplyBusy(true);
    setApplyMessage('');
    try {
      const result = await submitProjectApplication(user.id, String(project.id), project.title);
      setApplyMessage(result.message);
      if (result.ok && result.application) {
        setApplication(result.application);
        onApplySuccess?.();
      }
    } catch {
      setApplyMessage('Не удалось отправить заявку. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      setApplyBusy(false);
    }
  };

  const handleCancelApplication = async () => {
    if (!user || !application) return;
    if (!confirm('Отменить заявку на участие в проекте?')) return;

    setCancelBusy(true);
    const result = await cancelProjectApplication(user.id, application.id);
    setCancelBusy(false);
    setApplyMessage(result.message);
    if (result.ok) {
      setApplication(null);
      onApplySuccess?.();
    }
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
        </div>
      </div>

      <ProjectStarRating
        value={userStars}
        average={stats.rating}
        reviewCount={stats.reviewCount}
        disabled={ratingBusy || (userStars == null && remaining <= 0)}
        onRate={handleRate}
      />
      <p className="text-xs text-gray-500">
        {remaining > 0
          ? `Можно оценить ещё ${remaining} новых проектов сегодня (лимит 5).`
          : userStars == null
            ? 'Лимит новых оценок на сегодня исчерпан.'
            : 'Повторно нажмите звезды, чтобы изменить свою оценку.'}
      </p>
      {ratingMessage && <p className="text-sm text-gray-300">{ratingMessage}</p>}

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
        <div className="space-y-3 pt-1 border-t border-white/10">
          {application ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span
                className={`inline-flex px-4 py-2 rounded-xl font-bold text-xs uppercase ${
                  application.status === 'accepted'
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-yellow-400 bg-yellow-400/10'
                }`}
              >
                {APPLICATION_STATUS_LABELS[application.status]}
              </span>
              {application.status === 'pending' && (
                <button
                  type="button"
                  onClick={handleCancelApplication}
                  disabled={cancelBusy}
                  className="text-sm text-rose-400 hover:text-rose-300 font-semibold"
                >
                  {cancelBusy ? 'Отмена...' : 'Отменить заявку'}
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={applyBusy}
              className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-black font-bold py-2.5 px-6 rounded-xl text-sm transition-colors"
            >
              {applyBusy ? 'Отправка...' : 'Подать заявку'}
            </button>
          )}
          {applyMessage && <p className="text-sm text-gray-300">{applyMessage}</p>}
          {application && (
            <p className="text-xs text-gray-500">
              Статус заявки также доступен в личном кабинете → «Заявки».
            </p>
          )}
        </div>
      )}
    </div>
  );
};
