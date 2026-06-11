import { isSupabaseConfigured, supabase } from './supabase';
import { ensureAuthSession } from './projectService';
import {
  decryptBytes,
  encryptBytes,
  isMessageEncryptionEnabled,
  messageCryptoScopes,
} from '../utils/messageCrypto';

export interface ChatAttachmentMeta {
  path: string;
  name: string;
  mime: string;
}

const BUCKET = 'chat-attachments';
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export const validateChatFile = (file: File): { ok: boolean; error?: string } => {
  if (file.size > MAX_SIZE) {
    return { ok: false, error: 'Файл больше 5 МБ.' };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: 'Допустимы JPG, PNG, WebP и PDF.' };
  }
  return { ok: true };
};

const safeExt = (name: string): string => {
  const ext = name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  return ext || 'bin';
};

const uploadPayload = async (path: string, bytes: ArrayBuffer, storedMime: string) => {
  await ensureAuthSession();
  const blob = new Blob([bytes], { type: storedMime });
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: false,
    contentType: storedMime,
  });
  if (error) throw new Error(error.message);
};

export const uploadProjectChatFile = async (
  projectId: string,
  userId: string,
  file: File,
): Promise<{ ok: boolean; attachment?: ChatAttachmentMeta; error?: string }> => {
  const validation = validateChatFile(file);
  if (!validation.ok) return validation;

  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase не настроен.' };
  }

  const scope = messageCryptoScopes.projectChat(projectId);
  const raw = await file.arrayBuffer();
  const encrypted = isMessageEncryptionEnabled();
  const payload = encrypted ? await encryptBytes(raw, scope) : raw;
  const storedMime = encrypted ? 'application/octet-stream' : file.type;
  const path = `project/${projectId}/${userId}/${crypto.randomUUID()}.${safeExt(file.name)}.bin`;

  try {
    await uploadPayload(path, payload, storedMime);
    return { ok: true, attachment: { path, name: file.name, mime: file.type } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Не удалось загрузить файл.' };
  }
};

export const uploadDirectChatFile = async (
  userId: string,
  peerId: string,
  file: File,
): Promise<{ ok: boolean; attachment?: ChatAttachmentMeta; error?: string }> => {
  const validation = validateChatFile(file);
  if (!validation.ok) return validation;

  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase не настроен.' };
  }

  const scope = messageCryptoScopes.directChat(userId, peerId);
  const raw = await file.arrayBuffer();
  const encrypted = isMessageEncryptionEnabled();
  const payload = encrypted ? await encryptBytes(raw, scope) : raw;
  const storedMime = encrypted ? 'application/octet-stream' : file.type;
  const [a, b] = [userId, peerId].sort();
  const path = `direct/${a}_${b}/${userId}/${crypto.randomUUID()}.${safeExt(file.name)}.bin`;

  try {
    await uploadPayload(path, payload, storedMime);
    return { ok: true, attachment: { path, name: file.name, mime: file.type } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Не удалось загрузить файл.' };
  }
};

const fetchAttachmentBytes = async (path: string, scope: string): Promise<ArrayBuffer> => {
  await ensureAuthSession();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(error?.message || 'Файл не найден');
  }
  const raw = await data.arrayBuffer();
  if (isMessageEncryptionEnabled()) {
    return decryptBytes(raw, scope);
  }
  return raw;
};

export const downloadChatFile = async (
  path: string,
  scope: string,
  originalName: string,
  mime: string,
): Promise<void> => {
  const bytes = await fetchAttachmentBytes(path, scope);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = originalName;
  link.click();
  URL.revokeObjectURL(url);
};

export const openChatImage = async (
  path: string,
  scope: string,
  mime: string,
): Promise<string> => {
  const bytes = await fetchAttachmentBytes(path, scope);
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
};

export const isImageMime = (mime?: string | null): boolean =>
  Boolean(mime?.startsWith('image/'));
