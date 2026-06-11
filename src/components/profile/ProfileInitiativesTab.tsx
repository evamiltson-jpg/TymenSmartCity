import React, { useEffect, useState } from 'react';
import {
  INITIATIVE_STATUS_COLORS,
  INITIATIVE_STATUS_LABELS,
} from '../../constants/initiatives';
import {
  canDeleteInitiative,
  canEditInitiative,
  fetchMyInitiatives,
  type CitizenInitiative,
} from '../../services/initiativeService';
import { InitiativeCard } from '../InitiativeCard';
import { MyInitiativeModal } from './MyInitiativeModal';

interface ProfileInitiativesTabProps {
  userId: string;
  onOpenSubmit?: () => void;
  refreshKey?: number;
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
  refreshKey = 0,
}) => {
  const [initiatives, setInitiatives] = useState<CitizenInitiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [managedInitiative, setManagedInitiative] = useState<{
    id: string;
    mode: 'view' | 'edit';
  } | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    void fetchMyInitiatives(userId)
      .then(setInitiatives)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить инициативы.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [userId, refreshKey]);

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
    <>
      <div className="space-y-6">
        <p className="text-gray-400 text-sm">
          Всего предложений: <span className="text-white font-bold">{initiatives.length}</span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {initiatives.map((item) => {
            const editable = canEditInitiative(item.status);
            const deletable = canDeleteInitiative(item.status);

            return (
              <div key={item.id} className="space-y-3">
                <button
                  type="button"
                  onClick={() => setManagedInitiative({ id: item.id, mode: 'view' })}
                  className="w-full text-left"
                >
                  <InitiativeCard initiative={item} isOwn compact />
                </button>

                <div className="px-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
                  <span>Отправлено: {formatDate(item.created_at)}</span>
                  <span
                    className={`px-2 py-0.5 rounded border font-bold uppercase ${INITIATIVE_STATUS_COLORS[item.status]}`}
                  >
                    {INITIATIVE_STATUS_LABELS[item.status]}
                  </span>
                  {item.importance_votes > 0 && (
                    <span>
                      Оценка:{' '}
                      <span className="text-yellow-400 font-bold">
                        {Number(item.importance_rating).toFixed(1)}
                      </span>{' '}
                      ({item.importance_votes})
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => setManagedInitiative({ id: item.id, mode: 'view' })}
                    className="flex-1 min-w-[88px] py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase hover:bg-white/10"
                  >
                    Открыть
                  </button>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setManagedInitiative({ id: item.id, mode: 'edit' })}
                      className="flex-1 min-w-[88px] py-2.5 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-bold text-[10px] uppercase hover:bg-yellow-400/20"
                    >
                      Изменить
                    </button>
                  )}
                  {deletable && (
                    <button
                      type="button"
                      onClick={() => setManagedInitiative({ id: item.id, mode: 'view' })}
                      className="flex-1 min-w-[88px] py-2.5 rounded-xl border border-rose-500/30 text-rose-400 font-bold text-[10px] uppercase hover:bg-rose-500/10"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {managedInitiative && (
        <MyInitiativeModal
          initiativeId={managedInitiative.id}
          userId={userId}
          mode={managedInitiative.mode}
          onClose={() => setManagedInitiative(null)}
          onUpdated={load}
          onDeleted={load}
        />
      )}
    </>
  );
};
