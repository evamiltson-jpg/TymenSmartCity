export interface QuizSkillScore {
  name: string;
  score: number;
}

export interface QuizResultPayload {
  specialty: string;
  track: string;
  skills: string[];
  skillScores: QuizSkillScore[];
  overallScore: number;
  verdictTitle: string;
  verdictText: string;
  verdictRoast?: string;
  verdictTone: 'great' | 'good' | 'mid' | 'weak' | 'bad' | 'critical';
  completedAt: string;
  attempt: number;
}

const PENDING_KEY = 'pending_test_result_v2';

const metaKey = (userId?: string) => `it_quiz_meta_v2_${userId || 'guest'}`;

export const readPendingQuizResult = (): QuizResultPayload | null => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuizResultPayload;
  } catch {
    return null;
  }
};

export const writePendingQuizResult = (result: QuizResultPayload) => {
  localStorage.setItem(PENDING_KEY, JSON.stringify(result));
};

export const clearPendingQuizResult = () => {
  localStorage.removeItem(PENDING_KEY);
};

export const getQuizMeta = (userId?: string): QuizResultPayload | null => {
  try {
    const raw = localStorage.getItem(metaKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as QuizResultPayload;
  } catch {
    return null;
  }
};

export const saveQuizMeta = (userId: string | undefined, result: QuizResultPayload) => {
  const previous = getQuizMeta(userId);
  const payload: QuizResultPayload = {
    ...result,
    attempt: (previous?.attempt || 0) + 1,
    completedAt: result.completedAt,
  };
  localStorage.setItem(metaKey(userId), JSON.stringify(payload));
  return payload;
};

export const parseSkillEntry = (entry: string): { name: string; score?: number } => {
  const match = entry.match(/^(.+?)\s*[—-]\s*(\d{1,3})%$/);
  if (!match) return { name: entry.trim() };
  return { name: match[1].trim(), score: Number(match[2]) };
};

export const getSkillLevel = (score: number): string => {
  if (score >= 86) return 'Продвинутый';
  if (score >= 71) return 'Уверенный';
  if (score >= 51) return 'Рабочий';
  if (score >= 36) return 'Слабый';
  if (score >= 21) return 'Очень слабый';
  return 'Критический пробел';
};
