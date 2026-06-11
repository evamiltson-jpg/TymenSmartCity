import { INITIATIVE_PHOTO_LIMITS } from '../constants/initiatives';
import type { InitiativeCategory, InitiativeStatus } from '../constants/initiatives';
import { isSupabaseConfigured, supabase } from './supabase';
import { ensureAuthSession } from './projectService';

export interface CitizenInitiative {
  id: string;
  user_id: string;
  title: string;
  description: string;
  address: string | null;
  category: string;
  photo_urls: string[];
  status: InitiativeStatus;
  importance_rating: number;
  importance_votes: number;
  created_at: string;
  updated_at: string;
  user_vote?: number | null;
}

export interface CreateInitiativePayload {
  title: string;
  description: string;
  address?: string;
  category: InitiativeCategory;
  photoUrls: string[];
}

export interface UpdateInitiativePayload {
  title: string;
  description: string;
  address?: string;
  category: InitiativeCategory;
  photoUrls: string[];
}

export const EDITABLE_INITIATIVE_STATUSES: InitiativeStatus[] = ['pending', 'in_review'];
export const DELETABLE_INITIATIVE_STATUSES: InitiativeStatus[] = ['pending', 'rejected'];

export const canEditInitiative = (status: InitiativeStatus): boolean =>
  EDITABLE_INITIATIVE_STATUSES.includes(status);

export const canDeleteInitiative = (status: InitiativeStatus): boolean =>
  DELETABLE_INITIATIVE_STATUSES.includes(status);

const formatInitiativeError = (err: unknown): string => {
  if (err instanceof Error) {
    if (/permission denied|42501/i.test(err.message)) {
      return 'Нет прав на изменение инициативы.';
    }
    return err.message;
  }
  return 'Не удалось выполнить операцию с инициативой.';
};

const BUCKET = 'initiative-photos';

export const validateInitiativePhoto = (file: File): { ok: boolean; error?: string } => {
  if (file.size > INITIATIVE_PHOTO_LIMITS.maxBytes) {
    return { ok: false, error: `Фото больше ${INITIATIVE_PHOTO_LIMITS.label}.` };
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { ok: false, error: 'Допустимы JPG, PNG и WebP.' };
  }
  return { ok: true };
};

export const uploadInitiativePhoto = async (userId: string, file: File): Promise<string> => {
  const validation = validateInitiativePhoto(file);
  if (!validation.ok) throw new Error(validation.error);

  await ensureAuthSession();

  const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: '3600',
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const createCitizenInitiative = async (
  userId: string,
  payload: CreateInitiativePayload,
): Promise<CitizenInitiative> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase не настроен. Проверьте переменные окружения.');
  }

  await ensureAuthSession();

  const { data, error } = await supabase
    .from('citizen_initiatives')
    .insert({
      user_id: userId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      address: payload.address?.trim() || null,
      category: payload.category,
      photo_urls: payload.photoUrls,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CitizenInitiative;
};

export const fetchPublicInitiatives = async (
  options?: { limit?: number; category?: string; userId?: string },
): Promise<CitizenInitiative[]> => {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('citizen_initiatives')
    .select('*')
    .neq('status', 'rejected')
    .order('importance_rating', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.category && options.category !== 'Все') {
    query = query.eq('category', options.category);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const initiatives = (data ?? []) as CitizenInitiative[];

  if (options?.userId && initiatives.length > 0) {
    const votes = await fetchUserVotesForInitiatives(
      options.userId,
      initiatives.map((i) => i.id),
    );
    return initiatives.map((item) => ({
      ...item,
      user_vote: votes[item.id] ?? null,
    }));
  }

  return initiatives;
};

export const fetchMyInitiatives = async (userId: string): Promise<CitizenInitiative[]> => {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('citizen_initiatives')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CitizenInitiative[];
};

export const fetchMyInitiativeById = async (
  initiativeId: string,
  userId: string,
): Promise<CitizenInitiative | null> => {
  if (!isSupabaseConfigured) return null;

  await ensureAuthSession();

  const { data, error } = await supabase
    .from('citizen_initiatives')
    .select('*')
    .eq('id', initiativeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(formatInitiativeError(error));
  return (data as CitizenInitiative) ?? null;
};

export const updateCitizenInitiative = async (
  initiativeId: string,
  userId: string,
  payload: UpdateInitiativePayload,
): Promise<CitizenInitiative> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase не настроен.');
  }

  await ensureAuthSession();

  const existing = await fetchMyInitiativeById(initiativeId, userId);
  if (!existing) throw new Error('Инициатива не найдена.');
  if (!canEditInitiative(existing.status)) {
    throw new Error('Эту инициативу нельзя редактировать — она уже на рассмотрении или в работе.');
  }

  const { data, error } = await supabase
    .from('citizen_initiatives')
    .update({
      title: payload.title.trim(),
      description: payload.description.trim(),
      address: payload.address?.trim() || null,
      category: payload.category,
      photo_urls: payload.photoUrls,
      updated_at: new Date().toISOString(),
    })
    .eq('id', initiativeId)
    .eq('user_id', userId)
    .in('status', EDITABLE_INITIATIVE_STATUSES)
    .select()
    .single();

  if (error) throw new Error(formatInitiativeError(error));
  return data as CitizenInitiative;
};

export const deleteCitizenInitiative = async (
  initiativeId: string,
  userId: string,
): Promise<void> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase не настроен.');
  }

  await ensureAuthSession();

  const existing = await fetchMyInitiativeById(initiativeId, userId);
  if (!existing) throw new Error('Инициатива не найдена.');
  if (!canDeleteInitiative(existing.status)) {
    throw new Error('Можно удалить только инициативу «На рассмотрении» или «Отклонено».');
  }

  const { error } = await supabase
    .from('citizen_initiatives')
    .delete()
    .eq('id', initiativeId)
    .eq('user_id', userId)
    .in('status', DELETABLE_INITIATIVE_STATUSES);

  if (error) throw new Error(formatInitiativeError(error));
};

const fetchUserVotesForInitiatives = async (
  userId: string,
  initiativeIds: string[],
): Promise<Record<string, number>> => {
  if (!initiativeIds.length) return {};

  const { data, error } = await supabase
    .from('citizen_initiative_votes')
    .select('initiative_id, score')
    .eq('user_id', userId)
    .in('initiative_id', initiativeIds);

  if (error) return {};

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.initiative_id as string] = row.score as number;
  }
  return map;
};

export interface VoteInitiativeResult {
  ok: boolean;
  message: string;
  initiative?: CitizenInitiative;
}

export const voteCitizenInitiative = async (
  initiativeId: string,
  userId: string,
  score: number,
): Promise<VoteInitiativeResult> => {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase не настроен.' };
  }

  if (score < 1 || score > 5) {
    return { ok: false, message: 'Оценка должна быть от 1 до 5.' };
  }

  await ensureAuthSession();

  const { data: existing } = await supabase
    .from('citizen_initiative_votes')
    .select('id')
    .eq('initiative_id', initiativeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('citizen_initiative_votes')
      .update({ score, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase.from('citizen_initiative_votes').insert({
      initiative_id: initiativeId,
      user_id: userId,
      score,
    });

    if (error) return { ok: false, message: error.message };
  }

  const { data: updated, error: fetchError } = await supabase
    .from('citizen_initiatives')
    .select('*')
    .eq('id', initiativeId)
    .single();

  if (fetchError) {
    return { ok: true, message: 'Спасибо за оценку!' };
  }

  return {
    ok: true,
    message: existing ? 'Ваша оценка обновлена.' : 'Спасибо! Ваша оценка учтена.',
    initiative: { ...(updated as CitizenInitiative), user_vote: score },
  };
};
