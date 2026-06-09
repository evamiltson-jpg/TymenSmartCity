import { isSupabaseConfigured, supabase } from './supabase';
import { invalidateProjectsCache } from './projectService';
import type { ProjectData } from '../types';

const DAILY_LIMIT = 5;
const RATINGS_KEY = 'tsc_project_star_ratings_v2';
const DAILY_KEY = 'tsc_project_rating_daily';

interface DailyState {
  date: string;
  newToday: string[];
}

interface RatingEntry {
  stars: number;
  baseVotes: number;
  baseRating: number;
}

type StoredRatings = Record<string, RatingEntry>;

const todayKey = () => new Date().toLocaleDateString('sv-SE');

const readRatings = (): StoredRatings => {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    return raw ? (JSON.parse(raw) as StoredRatings) : {};
  } catch {
    return {};
  }
};

const writeRatings = (data: StoredRatings) => {
  try {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

const readDaily = (): DailyState => {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return { date: todayKey(), newToday: [] };
    const parsed = JSON.parse(raw) as DailyState;
    if (parsed.date !== todayKey()) return { date: todayKey(), newToday: [] };
    return parsed;
  } catch {
    return { date: todayKey(), newToday: [] };
  }
};

const writeDaily = (data: DailyState) => {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

export const getUserStarRating = (projectId: string) => readRatings()[String(projectId)]?.stars ?? null;

export const getRemainingRatingsToday = () => DAILY_LIMIT - readDaily().newToday.length;

export const computeDisplayProjectStats = (project: ProjectData) => {
  const entry = readRatings()[String(project.id)];
  if (!entry) {
    return { rating: project.rating, reviewCount: project.votes, userStars: null as number | null };
  }

  const reviewCount = entry.baseVotes + 1;
  const rating =
    entry.baseVotes > 0
      ? (entry.baseRating * entry.baseVotes + entry.stars) / reviewCount
      : entry.stars;

  return { rating, reviewCount, userStars: entry.stars };
};

const syncRatingToServer = async (projectId: string, stars: number, isNew: boolean, prevStars: number) => {
  if (!isSupabaseConfigured) return;

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('votes, rating')
      .eq('id', projectId)
      .maybeSingle();

    if (error || !data) return;

    const votes = Number(data.votes ?? 0);
    const rating = Number(data.rating ?? 0);

    let nextVotes = votes;
    let nextRating = rating;

    if (isNew) {
      nextVotes = votes + 1;
      nextRating = votes > 0 ? (rating * votes + stars) / nextVotes : stars;
    } else if (votes > 0) {
      nextRating = (rating * votes - prevStars + stars) / votes;
    }

    await supabase
      .from('projects')
      .update({ votes: nextVotes, rating: Number(nextRating.toFixed(1)) })
      .eq('id', projectId);

    invalidateProjectsCache();
  } catch {
    // ignore
  }
};

export interface RateProjectResult {
  ok: boolean;
  message: string;
}

export const rateProject = async (
  project: ProjectData,
  stars: number,
): Promise<RateProjectResult> => {
  const id = String(project.id);
  if (stars < 1 || stars > 5) {
    return { ok: false, message: 'Выберите оценку от 1 до 5 звёзд.' };
  }

  const ratings = readRatings();
  const daily = readDaily();
  const existing = ratings[id];
  const isNew = !existing;
  const prevStars = existing?.stars ?? 0;

  if (isNew && daily.newToday.length >= DAILY_LIMIT) {
    return {
      ok: false,
      message: `Сегодня можно оценить не более ${DAILY_LIMIT} проектов. Завтра лимит обновится.`,
    };
  }

  ratings[id] = {
    stars,
    baseVotes: existing?.baseVotes ?? project.votes,
    baseRating: existing?.baseRating ?? project.rating,
  };
  writeRatings(ratings);

  if (isNew) {
    daily.newToday.push(id);
    writeDaily(daily);
  }

  void syncRatingToServer(id, stars, isNew, prevStars);

  const left = DAILY_LIMIT - readDaily().newToday.length;
  return {
    ok: true,
    message: isNew
      ? left > 0
        ? `Спасибо! Осталось оценок сегодня: ${left} из ${DAILY_LIMIT}.`
        : `Спасибо! Вы использовали все ${DAILY_LIMIT} оценок на сегодня.`
      : 'Ваша оценка обновлена.',
  };
};
