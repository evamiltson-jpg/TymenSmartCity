import { isSupabaseConfigured, supabase } from './supabase';
import { ensureAuthSession } from './projectService';

export type NotificationType =
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'chat_message';

export interface UserNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link_payload: Record<string, string>;
  related_application_id: string | null;
  related_project_id: string | null;
  is_read: boolean;
  created_at: string;
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

export const fetchNotifications = async (userId: string, limit = 40): Promise<UserNotification[]> => {
  if (!isSupabaseConfigured) return [];

  await ensureAuthSession();
  const { data, error } = await withTimeout(
    supabase
      .from('user_notifications')
      .select(
        'id, user_id, type, title, body, link_payload, related_application_id, related_project_id, is_read, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  );

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) return [];
    throw error;
  }

  return (data || []) as UserNotification[];
};

export const fetchUnreadCount = async (userId: string): Promise<number> => {
  if (!isSupabaseConfigured) return 0;

  await ensureAuthSession();
  const { count, error } = await withTimeout(
    supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
  );

  if (error) {
    if (/relation.*does not exist/i.test(error.message)) return 0;
    return 0;
  }

  return count ?? 0;
};

export const markNotificationRead = async (userId: string, notificationId: string): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  await ensureAuthSession();
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  return !error;
};

export const markAllNotificationsRead = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  await ensureAuthSession();
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  return !error;
};
