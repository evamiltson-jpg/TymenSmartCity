import { isSupabaseConfigured, supabase } from './supabase';
import { ensureAuthSession } from './projectService';

export interface ProjectChatMessage {
  id: string;
  project_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender_name?: string;
  sender_contact?: string | null;
}

export interface ChatProjectOption {
  project_id: string;
  project_title: string;
  role: 'owner' | 'member';
}

const QUERY_TIMEOUT_MS = 12_000;

const withTimeout = async <T>(promise: PromiseLike<T>, ms = QUERY_TIMEOUT_MS): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const fetchMyChatProjects = async (userId: string): Promise<ChatProjectOption[]> => {
  if (!isSupabaseConfigured) return [];

  await ensureAuthSession();

  const [ownedRes, memberRes] = await Promise.all([
    withTimeout(
      supabase
        .from('projects')
        .select('id, title')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(30),
    ),
    withTimeout(
      supabase
        .from('user_applications')
        .select('project_id, project_title')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .order('submitted_at', { ascending: false })
        .limit(30),
    ),
  ]);

  const options: ChatProjectOption[] = [];
  const seen = new Set<string>();

  for (const row of ownedRes.data || []) {
    const id = String(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    options.push({ project_id: id, project_title: row.title, role: 'owner' });
  }

  for (const row of memberRes.data || []) {
    if (!row.project_id || seen.has(row.project_id)) continue;
    seen.add(row.project_id);
    options.push({
      project_id: row.project_id,
      project_title: row.project_title,
      role: 'member',
    });
  }

  return options;
};

export const fetchProjectMessages = async (projectId: string): Promise<ProjectChatMessage[]> => {
  if (!isSupabaseConfigured) return [];

  await ensureAuthSession();
  const { data, error } = await withTimeout(
    supabase
      .from('project_chat_messages')
      .select('id, project_id, sender_id, body, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(200),
  );

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) return [];
    throw error;
  }

  const messages = (data || []) as ProjectChatMessage[];
  if (messages.length === 0) return messages;

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, contact_info')
    .in('id', senderIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [
      p.id,
      {
        name: p.full_name || p.email || 'Участник',
        contact: p.contact_info as string | null,
      },
    ]),
  );

  return messages.map((m) => ({
    ...m,
    sender_name: profileMap.get(m.sender_id)?.name ?? 'Участник',
    sender_contact: profileMap.get(m.sender_id)?.contact ?? null,
  }));
};

export const sendProjectMessage = async (
  projectId: string,
  senderId: string,
  body: string,
): Promise<{ ok: boolean; message?: ProjectChatMessage; error?: string }> => {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase не настроен.' };
  }

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: 'Введите сообщение.' };

  await ensureAuthSession();
  const { data, error } = await withTimeout(
    supabase
      .from('project_chat_messages')
      .insert({ project_id: projectId, sender_id: senderId, body: trimmed })
      .select('id, project_id, sender_id, body, created_at')
      .single(),
  );

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) {
      return { ok: false, error: 'Чат ещё не настроен на сервере. Примените миграцию Supabase.' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, message: data as ProjectChatMessage };
};
