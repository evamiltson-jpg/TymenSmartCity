import type { ProjectBrief } from './aiService';
import { supabase } from './supabase';
import {
  applyDailySessionReset,
  getLocalDayKey,
  type ActiveChatState,
  type ChatArchive,
  type StoredChatMessage,
} from '../utils/chatStorage';

export interface ProshaPersistedState extends ActiveChatState {
  brief: ProjectBrief;
  timeline: { week: string; title: string }[];
}

export const defaultBrief = (): ProjectBrief => ({
  linkedProjectId: null,
  title: '',
  description: '',
  stage: 'idea',
  technologies: [],
});

export const emptyProshaState = (): ProshaPersistedState => ({
  messages: [],
  sessionCount: 0,
  archives: [],
  sessionDay: getLocalDayKey(),
  brief: defaultBrief(),
  timeline: [],
});

const normalizeBrief = (raw: unknown): ProjectBrief => {
  if (!raw || typeof raw !== 'object') return defaultBrief();
  const b = raw as Partial<ProjectBrief>;
  return {
    linkedProjectId: b.linkedProjectId ?? null,
    title: b.title ?? '',
    description: b.description ?? '',
    stage: b.stage ?? 'idea',
    technologies: Array.isArray(b.technologies) ? b.technologies : [],
  };
};

const normalizeMessages = (raw: unknown): StoredChatMessage[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m === 'object' && 'role' in m && 'text' in m)
    .map((m) => ({
      role: (m as StoredChatMessage).role === 'user' ? 'user' : 'ai',
      text: String((m as StoredChatMessage).text ?? ''),
    }));
};

const normalizeArchives = (raw: unknown): ChatArchive[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a === 'object' && 'id' in a && 'messages' in a)
    .map((a) => ({
      id: String((a as ChatArchive).id),
      title: String((a as ChatArchive).title ?? 'Диалог'),
      messages: normalizeMessages((a as ChatArchive).messages),
      sessionCount: Number((a as ChatArchive).sessionCount) || 0,
      savedAt: String((a as ChatArchive).savedAt ?? new Date().toISOString()),
    }));
};

const normalizeTimeline = (raw: unknown) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t === 'object' && 'week' in t && 'title' in t)
    .map((t) => ({
      week: String((t as { week: string }).week),
      title: String((t as { title: string }).title),
    }));
};

const rowToState = (row: Record<string, unknown>): ProshaPersistedState => {
  const base = applyDailySessionReset({
    messages: normalizeMessages(row.messages),
    sessionCount: Number(row.session_count) || 0,
    archives: normalizeArchives(row.archives),
    sessionDay: typeof row.session_day === 'string' ? row.session_day : undefined,
  });
  return {
    ...base,
    brief: normalizeBrief(row.brief),
    timeline: normalizeTimeline(row.timeline),
  };
};

export const fetchProshaChat = async (userId: string): Promise<ProshaPersistedState | null> => {
  const { data, error } = await supabase
    .from('user_prosha_chats')
    .select('messages, archives, session_count, session_day, brief, timeline')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return rowToState(data as Record<string, unknown>);
};

export const saveProshaChat = async (userId: string, state: ProshaPersistedState) => {
  const payload = {
    user_id: userId,
    messages: state.messages,
    archives: state.archives,
    session_count: state.sessionCount,
    session_day: state.sessionDay ?? getLocalDayKey(),
    brief: state.brief,
    timeline: state.timeline,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_prosha_chats').upsert(payload, {
    onConflict: 'user_id',
  });

  if (error) throw error;
};
