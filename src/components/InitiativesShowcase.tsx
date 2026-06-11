import React, { useCallback, useEffect, useState } from 'react';
import { INITIATIVE_CATEGORIES } from '../constants/initiatives';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchPublicInitiatives,
  voteCitizenInitiative,
  type CitizenInitiative,
} from '../services/initiativeService';
import { InitiativeCard } from './InitiativeCard';

interface InitiativesShowcaseProps {
  onNavigate?: (page: string, tab?: string) => void;
  onOpenSubmit?: () => void;
  limit?: number;
}

export const InitiativesShowcase: React.FC<InitiativesShowcaseProps> = ({
  onNavigate,
  onOpenSubmit,
  limit = 6,
}) => {
  const { user } = useAuth();
  const [initiatives, setInitiatives] = useState<CitizenInitiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [voteBusyId, setVoteBusyId] = useState<string | null>(null);
  const [voteMessage, setVoteMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPublicInitiatives({
        limit: selectedCategory === 'Все' ? limit : 20,
        category: selectedCategory,
        userId: user?.id,
      });
      setInitiatives(data);
    } catch (err) {
      console.error('Initiatives load error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, selectedCategory, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleVote = async (initiative: CitizenInitiative, score: number) => {
    if (!user) {
      onNavigate?.('login');
      return;
    }

    if (initiative.user_id === user.id) return;

    setVoteBusyId(initiative.id);
    setVoteMessage('');
    try {
      const result = await voteCitizenInitiative(initiative.id, user.id, score);
      setVoteMessage(result.message);
      if (result.ok && result.initiative) {
        setInitiatives((prev) =>
          prev.map((item) => (item.id === initiative.id ? result.initiative! : item)),
        );
      } else if (!result.ok) {
        setVoteMessage(result.message);
      }
    } finally {
      setVoteBusyId(null);
    }
  };

  const categories = ['Все', ...INITIATIVE_CATEGORIES];

  return (
    <section className="py-10 sm:py-14">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 sm:h-10 bg-yellow-400 rounded-full shrink-0" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Идеи жителей</h2>
            </div>
            <p className="text-gray-400 text-sm sm:text-base ml-4 sm:ml-5 max-w-2xl">
              Предложения по улучшению города — оцените, насколько они важны для вас
            </p>
          </div>
          {onOpenSubmit && (
            <button
              type="button"
              onClick={onOpenSubmit}
              className="shrink-0 w-full sm:w-auto px-5 py-3 rounded-xl bg-yellow-400 text-black font-black text-sm uppercase tracking-wider hover:bg-yellow-300 transition-colors"
            >
              Предложить идею
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 sm:mb-8 -mx-1 px-1 scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all border ${
              selectedCategory === cat
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {voteMessage && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 text-sm font-bold border border-green-500/20">
          {voteMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[320px] sm:h-[380px] bg-[#122e41] rounded-2xl animate-pulse border border-white/5"
            />
          ))
        ) : initiatives.length > 0 ? (
          initiatives.map((item) => (
            <InitiativeCard
              key={item.id}
              initiative={item}
              isOwn={user?.id === item.user_id}
              canVote={Boolean(user)}
              voting={voteBusyId === item.id}
              onVote={(score) => void handleVote(item, score)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 px-4 rounded-2xl border border-dashed border-white/10">
            <p className="text-gray-400 mb-4">Пока нет предложений в этой категории</p>
            {onOpenSubmit && (
              <button
                type="button"
                onClick={onOpenSubmit}
                className="px-5 py-2 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/15"
              >
                Стать первым
              </button>
            )}
          </div>
        )}
      </div>

      {user && onNavigate && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => onNavigate('profile', 'initiatives')}
            className="text-sm text-yellow-400 font-bold hover:underline"
          >
            Мои инициативы в личном кабинете →
          </button>
        </div>
      )}
    </section>
  );
};
