import React, { useEffect, useState } from 'react';
import {
  INITIATIVE_STATUS_COLORS,
  INITIATIVE_STATUS_LABELS,
} from '../../constants/initiatives';
import { fetchMyInitiatives, type CitizenInitiative } from '../../services/initiativeService';
import { InitiativeCard } from '../InitiativeCard';

interface ProfileInitiativesTabProps {
  userId: string;
  onOpenSubmit?: () => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const ProfileInitiativesTab: React.FC<ProfileInitiativesTabProps> = ({
  userId,
  onOpenSubmit,
}) => {
  const [initiatives, setInitiatives] = useState<CitizenInitiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    void fetchMyInitiatives(userId)
      .then((data) => {
        if (!cancelled) setInitiatives(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить инициативы.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-[#122e41] rounded-2xl animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20">
        {error}
      </div>
    );
  }

  if (!initiatives.length) {
    return (
      <div className="text-center py-16 px-4 bg-[#122e41] rounded-[32px] border border-white/5">
        <p className="text-gray-400 mb-2">Вы ещё не предлагали инициатив</p>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Расскажите, что стоит улучшить в городе — идея появится здесь со статусом рассмотрения
        </p>
        {onOpenSubmit && (
          <button
            type="button"
            onClick={onOpenSubmit}
            className="px-6 py-3 rounded-xl bg-yellow-400 text-black font-black text-sm uppercase"
          >
            Предложить идею
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-400 text-sm">
        Всего предложений: <span className="text-white font-bold">{initiatives.length}</span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {initiatives.map((item) => (
          <div key={item.id} className="space-y-3">
            <InitiativeCard initiative={item} isOwn compact />
            <div className="px-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>Отправлено: {formatDate(item.created_at)}</span>
              <span
                className={`px-2 py-0.5 rounded border font-bold uppercase ${INITIATIVE_STATUS_COLORS[item.status]}`}
              >
                {INITIATIVE_STATUS_LABELS[item.status]}
              </span>
              {item.importance_votes > 0 && (
                <span>
                  Оценка жителей:{' '}
                  <span className="text-yellow-400 font-bold">
                    {Number(item.importance_rating).toFixed(1)}
                  </span>{' '}
                  ({item.importance_votes})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
