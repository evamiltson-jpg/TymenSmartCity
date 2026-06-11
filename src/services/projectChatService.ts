import { isSupabaseConfigured, supabase } from './supabase';
import { ensureAuthSession } from './projectService';
import {
  decryptMessage,
  encryptMessage,
  messageCryptoScopes,
} from '../utils/messageCrypto';
import { sanitizeChatInput } from '../utils/security';
import type { ChatAttachmentMeta } from './chatFileService';

export interface ProjectChatMessage {
  id: string;
  project_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  sender_name?: string;
  sender_contact?: string | null;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  sender_name?: string;
}

export interface ChatProjectOption {
  project_id: string;
  project_title: string;
  role: 'owner' | 'member';
}

export interface DirectChatOption {
  peer_id: string;
  peer_name: string;
  last_message?: string;
  last_at?: string;
}

export interface ProjectChatParticipant {
  user_id: string;
  name: string;
  contact_info?: string | null;
  role: 'owner' | 'member';
}

export type MessengerSelection =
  | { kind: 'project'; projectId: string }
  | { kind: 'direct'; peerId: string };

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

const loadHiddenProjectIds = async (userId: string): Promise<Set<string>> => {
  const { data } = await supabase
    .from('user_hidden_project_chats')
    .select('project_id')
    .eq('user_id', userId);
  return new Set((data || []).map((row) => row.project_id as string));
};

const loadHiddenPeerIds = async (userId: string): Promise<Set<string>> => {
  const { data } = await supabase
    .from('user_hidden_direct_chats')
    .select('peer_user_id')
    .eq('user_id', userId);
  return new Set((data || []).map((row) => row.peer_user_id as string));
};

const profileName = (p: { full_name?: string | null; email?: string | null }) =>
  p.full_name?.trim() || p.email || 'Участник';

export const fetchMyChatProjects = async (userId: string): Promise<ChatProjectOption[]> => {
  if (!isSupabaseConfigured) return [];

  await ensureAuthSession();
  const hidden = await loadHiddenProjectIds(userId).catch(() => new Set<string>());

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
    if (seen.has(id) || hidden.has(id)) continue;
    seen.add(id);
    options.push({ project_id: id, project_title: row.title, role: 'owner' });
  }

  for (const row of memberRes.data || []) {
    if (!row.project_id || seen.has(row.project_id) || hidden.has(row.project_id)) continue;
    seen.add(row.project_id);
    options.push({
      project_id: row.project_id,
      project_title: row.project_title,
      role: 'member',
    });
  }

  return options;
};

export const fetchProjectParticipants = async (
  projectId: string,
): Promise<ProjectChatParticipant[]> => {
  if (!isSupabaseConfigured) return [];

  await ensureAuthSession();

  const { data: project } = await supabase
    .from('projects')
    .select('created_by, author_name')
    .eq('id', projectId)
    .maybeSingle();

  const { data: members } = await supabase
    .from('user_applications')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('status', 'accepted');

  const userIds = new Set<string>();
  if (project?.created_by) userIds.add(project.created_by);
  for (const m of members || []) userIds.add(m.user_id);

  if (userIds.size === 0) return [];

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, contact_info')
    .in('id', [...userIds]);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const participants: ProjectChatParticipant[] = [];

  if (project?.created_by) {
    const owner = profileMap.get(project.created_by);
    participants.push({
      user_id: project.created_by,
      name: owner ? profileName(owner) : project.author_name || 'Автор',
      contact_info: owner?.contact_info ?? null,
      role: 'owner',
    });
  }

  for (const m of members || []) {
    if (m.user_id === project?.created_by) continue;
    const profile = profileMap.get(m.user_id);
    participants.push({
      user_id: m.user_id,
      name: profile ? profileName(profile) : 'Участник',
      contact_info: profile?.contact_info ?? null,
      role: 'member',
    });
  }

  return participants;
};

export const hideProjectChat = async (
  userId: string,
  projectId: string,
): Promise<{ ok: boolean; error?: string }> => {
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase не настроен.' };

  await ensureAuthSession();
  const { error: delError } = await supabase
    .from('user_hidden_project_chats')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (delError && !/relation.*does not exist/i.test(delError.message)) {
    return { ok: false, error: delError.message };
  }

  const { error } = await supabase
    .from('user_hidden_project_chats')
    .insert({ user_id: userId, project_id: projectId });

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) {
      return { ok: false, error: 'Функция скрытия чата ещё не настроена на сервере.' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
};

export const fetchProjectMessages = async (projectId: string): Promise<ProjectChatMessage[]> => {
  if (!isSupabaseConfigured) return [];

  await ensureAuthSession();
  const { data, error } = await withTimeout(
    supabase
      .from('project_chat_messages')
      .select('id, project_id, sender_id, body, attachment_path, attachment_name, attachment_mime, created_at')
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
      { name: profileName(p), contact: p.contact_info as string | null },
    ]),
  );

  const enriched = messages.map((m) => ({
    ...m,
    sender_name: profileMap.get(m.sender_id)?.name ?? 'Участник',
    sender_contact: profileMap.get(m.sender_id)?.contact ?? null,
  }));

  return Promise.all(
    enriched.map(async (m) => ({
      ...m,
      body: await decryptMessage(m.body, messageCryptoScopes.projectChat(projectId)),
    })),
  );
};

export const sendProjectMessage = async (
  projectId: string,
  senderId: string,
  body: string,
  attachment?: ChatAttachmentMeta,
): Promise<{ ok: boolean; message?: ProjectChatMessage; error?: string }> => {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase не настроен.' };
  }

  const trimmed = sanitizeChatInput(body, 1000);
  if (!trimmed && !attachment) {
    return { ok: false, error: 'Введите сообщение или прикрепите файл.' };
  }

  const plainBody = trimmed || `📎 ${attachment?.name || 'файл'}`;
  const encryptedBody = await encryptMessage(
    plainBody,
    messageCryptoScopes.projectChat(projectId),
  );

  await ensureAuthSession();
  const { data, error } = await withTimeout(
    supabase
      .from('project_chat_messages')
      .insert({
        project_id: projectId,
        sender_id: senderId,
        body: encryptedBody,
        attachment_path: attachment?.path ?? null,
        attachment_name: attachment?.name ?? null,
        attachment_mime: attachment?.mime ?? null,
      })
      .select('id, project_id, sender_id, body, attachment_path, attachment_name, attachment_mime, created_at')
      .single(),
  );

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) {
      return { ok: false, error: 'Чат ещё не настроен на сервере.' };
    }
    return { ok: false, error: error.message };
  }

  const row = data as ProjectChatMessage;
  return {
    ok: true,
    message: {
      ...row,
      body: plainBody,
    },
  };
};

export const fetchDirectChats = async (userId: string): Promise<DirectChatOption[]> => {
  if (!isSupabaseConfigured) return [];

  await ensureAuthSession();
  const hidden = await loadHiddenPeerIds(userId).catch(() => new Set<string>());

  const { data, error } = await withTimeout(
    supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, attachment_path, attachment_name, attachment_mime, created_at')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(200),
  );

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) return [];
    return [];
  }

  const peerMap = new Map<string, DirectChatOption>();

  for (const row of data || []) {
    const peerId = row.sender_id === userId ? row.recipient_id : row.sender_id;
    if (hidden.has(peerId) || peerMap.has(peerId)) continue;
    const preview = await decryptMessage(
      row.body as string,
      messageCryptoScopes.directChat(userId, peerId),
    );
    peerMap.set(peerId, {
      peer_id: peerId,
      peer_name: 'Участник',
      last_message: preview,
      last_at: row.created_at,
    });
  }

  const peerIds = [...peerMap.keys()];
  if (peerIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, email')
    .in('id', peerIds);

  for (const p of profiles || []) {
    const chat = peerMap.get(p.id);
    if (chat) chat.peer_name = profileName(p);
  }

  return [...peerMap.values()];
};

export const fetchDirectMessages = async (
  userId: string,
  peerId: string,
): Promise<DirectMessage[]> => {
  if (!isSupabaseConfigured) return [];

  await ensureAuthSession();
  const { data, error } = await withTimeout(
    supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, attachment_path, attachment_name, attachment_mime, is_read, created_at')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`,
      )
      .order('created_at', { ascending: true })
      .limit(200),
  );

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) return [];
    throw error;
  }

  await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('sender_id', peerId)
    .eq('is_read', false);

  const scope = messageCryptoScopes.directChat(userId, peerId);
  return Promise.all(
    ((data || []) as DirectMessage[]).map(async (msg) => ({
      ...msg,
      body: await decryptMessage(msg.body, scope),
    })),
  );
};

export const sendDirectMessage = async (
  userId: string,
  peerId: string,
  body: string,
  attachment?: ChatAttachmentMeta,
): Promise<{ ok: boolean; error?: string }> => {
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase не настроен.' };
  if (userId === peerId) return { ok: false, error: 'Нельзя написать самому себе.' };

  const trimmed = sanitizeChatInput(body, 1000);
  if (!trimmed && !attachment) {
    return { ok: false, error: 'Введите сообщение или прикрепите файл.' };
  }

  const plainBody = trimmed || `📎 ${attachment?.name || 'файл'}`;
  const encryptedBody = await encryptMessage(
    plainBody,
    messageCryptoScopes.directChat(userId, peerId),
  );

  await ensureAuthSession();

  await supabase
    .from('user_hidden_direct_chats')
    .delete()
    .eq('user_id', userId)
    .eq('peer_user_id', peerId);

  const { error } = await supabase.from('direct_messages').insert({
    sender_id: userId,
    recipient_id: peerId,
    body: encryptedBody,
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_mime: attachment?.mime ?? null,
  });

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) {
      return { ok: false, error: 'Личные сообщения ещё не настроены на сервере.' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
};

export const hideDirectChat = async (
  userId: string,
  peerId: string,
): Promise<{ ok: boolean; error?: string }> => {
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase не настроен.' };

  await ensureAuthSession();
  await supabase
    .from('user_hidden_direct_chats')
    .delete()
    .eq('user_id', userId)
    .eq('peer_user_id', peerId);

  const { error } = await supabase
    .from('user_hidden_direct_chats')
    .insert({ user_id: userId, peer_user_id: peerId });

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) {
      return { ok: false, error: 'Функция скрытия чата ещё не настроена на сервере.' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
};

export const unhideDirectChat = async (userId: string, peerId: string) => {
  if (!isSupabaseConfigured) return;
  await supabase
    .from('user_hidden_direct_chats')
    .delete()
    .eq('user_id', userId)
    .eq('peer_user_id', peerId);
};
