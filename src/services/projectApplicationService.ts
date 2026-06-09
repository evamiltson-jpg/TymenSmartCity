import { isSupabaseConfigured, supabase } from './supabase';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface ProjectApplication {
  id: string;
  user_id: string;
  project_id: string;
  project_title: string;
  status: ApplicationStatus;
  submitted_at: string;
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'На рассмотрении',
  accepted: 'Принято',
  rejected: 'Отклонено',
};

export const fetchUserApplications = async (userId: string): Promise<ProjectApplication[]> => {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('user_applications')
    .select('id, user_id, project_id, project_title, status, submitted_at')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as ProjectApplication[];
};

export const fetchApplicationForProject = async (
  userId: string,
  projectId: string,
): Promise<ProjectApplication | null> => {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('user_applications')
    .select('id, user_id, project_id, project_title, status, submitted_at')
    .eq('user_id', userId)
    .eq('project_id', String(projectId))
    .in('status', ['pending', 'accepted'])
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as ProjectApplication) || null;
};

export const submitProjectApplication = async (
  userId: string,
  projectId: string,
  projectTitle: string,
): Promise<{ ok: boolean; message: string; application?: ProjectApplication }> => {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase не настроен. Заявку нельзя отправить.' };
  }

  const existing = await fetchApplicationForProject(userId, projectId);
  if (existing?.status === 'pending') {
    return { ok: false, message: 'Заявка уже на рассмотрении. Смотрите статус в личном кабинете.' };
  }
  if (existing?.status === 'accepted') {
    return { ok: false, message: 'Вы уже приняты в этот проект.' };
  }

  const { data, error } = await supabase
    .from('user_applications')
    .insert({
      user_id: userId,
      project_id: String(projectId),
      project_title: projectTitle,
      status: 'pending',
    })
    .select('id, user_id, project_id, project_title, status, submitted_at')
    .single();

  if (error) {
    return { ok: false, message: error.message || 'Не удалось отправить заявку.' };
  }

  return {
    ok: true,
    message: 'Заявка отправлена! Статус можно отслеживать в личном кабинете → Заявки.',
    application: data as ProjectApplication,
  };
};

export const cancelProjectApplication = async (
  userId: string,
  applicationId: string,
): Promise<{ ok: boolean; message: string }> => {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase не настроен.' };
  }

  const { error } = await supabase
    .from('user_applications')
    .delete()
    .eq('id', applicationId)
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) {
    return { ok: false, message: error.message || 'Не удалось отменить заявку.' };
  }

  return { ok: true, message: 'Заявка отменена.' };
};
