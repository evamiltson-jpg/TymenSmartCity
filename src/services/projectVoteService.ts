import { isSupabaseConfigured, supabase } from './supabase';
import { invalidateProjectsCache } from './projectService';

const DAILY_LIMIT = 5;
const DAILY_KEY = 'tsc_votes_daily';
const BONUS_KEY = 'tsc_vote_bonus';

interface DailyVotes {
  date: string;
  projectIds: string[];
}

const todayKey = () => new Date().toLocaleDateString('sv-SE');

const readDaily = (): DailyVotes => {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return { date: todayKey(), projectIds: [] };
    const parsed = JSON.parse(raw) as DailyVotes;
    if (parsed.date !== todayKey()) return { date: todayKey(), projectIds: [] };
    return parsed;
  } catch {
    return { date: todayKey(), projectIds: [] };
  }
};

const writeDaily = (data: DailyVotes) => {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

const readBonus = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(BONUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
};

const writeBonus = (data: Record<string, number>) => {
  try {
    localStorage.setItem(BONUS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

export const getLocalVoteBonus = (projectId: string) => readBonus()[projectId] ?? 0;

export const getRemainingVotesToday = () => DAILY_LIMIT - readDaily().projectIds.length;

export const hasVotedToday = (projectId: string) => readDaily().projectIds.includes(String(projectId));

const syncVoteToServer = async (projectId: string) => {
  if (!isSupabaseConfigured) return;

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('votes, rating')
      .eq('id', projectId)
      .maybeSingle();

    if (error || !data) return;

    const votes = Number(data.votes ?? 0) + 1;
    const rating = Number(data.rating ?? 0);
    const nextRating = rating > 0 ? Math.min(5, rating + 0.1) : 4;

    await supabase.from('projects').update({ votes, rating: Number(nextRating.toFixed(1)) }).eq('id', projectId);
    invalidateProjectsCache();
  } catch {
    // RLS может блокировать — локальный голос всё равно учтён
  }
};

export interface VoteResult {
  ok: boolean;
  message: string;
}

export const voteForProject = async (projectId: string): Promise<VoteResult> => {
  const id = String(projectId);

  if (hasVotedToday(id)) {
    return { ok: false, message: 'Вы уже голосовали за этот проект сегодня.' };
  }

  const daily = readDaily();
  if (daily.projectIds.length >= DAILY_LIMIT) {
    return { ok: false, message: `Лимит голосов на сегодня (${DAILY_LIMIT}) исчерпан. Возвращайтесь завтра!` };
  }

  daily.projectIds.push(id);
  writeDaily(daily);

  const bonus = readBonus();
  bonus[id] = (bonus[id] ?? 0) + 1;
  writeBonus(bonus);

  void syncVoteToServer(id);

  const left = DAILY_LIMIT - daily.projectIds.length;
  return {
    ok: true,
    message: left > 0 ? `Спасибо! Осталось голосов сегодня: ${left}.` : 'Спасибо! Вы использовали все голоса на сегодня.',
  };
};
