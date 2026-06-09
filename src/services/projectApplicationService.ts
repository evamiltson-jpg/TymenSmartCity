import { isSupabaseConfigured, supabase } from './supabase';
import { ensureAuthSession } from './projectService';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface ProjectApplication {
  id: string;
  user_id: string;
  project_id: string | null;
  project_title: string;
  status: ApplicationStatus;
  submitted_at: string;
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'На рассмотрении',
  accepted: 'Принято',
  rejected: 'Отклонено',
};

const QUERY_TIMEOUT_MS = 12_000;
const appsCacheKey = (userId: string) => `tsc_applications_${userId}`;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeProjectId = (projectId: string): string | null =>
  isUuid(projectId) ? projectId : null;

const formatApplicationError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message: string }).message);
    if (/заняло слишком много времени|timeout|abort/i.test(message)) {
      return 'Сервер не ответил вовремя. Проверьте вкладку «Заявки» в личном кабинете — заявка могла сохраниться.';
    }
    if (/invalid input syntax for type uuid/i.test(message)) {
      return 'Ошибка идентификатора проекта. Обновите страницу и попробуйте снова.';
    }
    if (/permission denied|42501/i.test(message)) {
      return 'Нет прав на отправку заявки. Обратитесь к администратору или выполните миграцию Supabase.';
    }
    return message;
  }
  return 'Не удалось выполнить операцию с заявкой.';
};

const withTimeout = async <T>(promise: PromiseLike<T>, ms = QUERY_TIMEOUT_MS): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Запрос занял слишком много времени')),
      ms,
    );
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const readAppsCache = (userId: string): ProjectApplication[] => {
  try {
    const raw = sessionStorage.getItem(appsCacheKey(userId));
    return raw ? (JSON.parse(raw) as ProjectApplication[]) : [];
  } catch {
    return [];
  }
};

const writeAppsCache = (userId: string, apps: ProjectApplication[]) => {
  try {
    sessionStorage.setItem(appsCacheKey(userId), JSON.stringify(apps));
  } catch {
    // ignore
  }
};

const upsertAppsCache = (userId: string, app: ProjectApplication) => {
  const cached = readAppsCache(userId).filter((item) => item.id !== app.id);
  writeAppsCache(userId, [app, ...cached]);
};

const removeFromAppsCache = (userId: string, applicationId: string) => {
  writeAppsCache(
    userId,
    readAppsCache(userId).filter((item) => item.id !== applicationId),
  );
};

const matchesProject = (app: ProjectApplication, projectId: string, projectTitle: string) => {
  const normalizedId = normalizeProjectId(projectId);
  if (normalizedId && app.project_id === normalizedId) return true;
  return app.project_title.trim().toLowerCase() === projectTitle.trim().toLowerCase();
};

const selectColumns = 'id, user_id, project_id, project_title, status, submitted_at';

export const fetchUserApplications = async (userId: string): Promise<ProjectApplication[]> => {
  if (!isSupabaseConfigured) return readAppsCache(userId);

  try {
    await ensureAuthSession();
    const { data, error } = await withTimeout(
      supabase
        .from('user_applications')
        .select(selectColumns)
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(50),
    );

    if (error) throw error;
    const apps = (data || []) as ProjectApplication[];
    writeAppsCache(userId, apps);
    return apps;
  } catch (error) {
    const cached = readAppsCache(userId);
    if (cached.length) return cached;
    throw error;
  }
};

export const fetchApplicationForProject = async (
  userId: string,
  projectId: string,
  projectTitle: string,
): Promise<ProjectApplication | null> => {
  if (!isSupabaseConfigured) {
    return (
      readAppsCache(userId).find(
        (app) =>
          matchesProject(app, projectId, projectTitle) &&
          (app.status === 'pending' || app.status === 'accepted'),
      ) ?? null
    );
  }

  try {
    await ensureAuthSession();

    let query = supabase
      .from('user_applications')
      .select(selectColumns)
      .eq('user_id', userId)
      .in('status', ['pending', 'accepted'])
      .order('submitted_at', { ascending: false })
      .limit(1);

    const normalizedId = normalizeProjectId(projectId);
    query = normalizedId
      ? query.eq('project_id', normalizedId)
      : query.eq('project_title', projectTitle);

    const { data, error } = await withTimeout(query.maybeSingle());
    if (error) throw error;
    return (data as ProjectApplication) || null;
  } catch {
    return (
      readAppsCache(userId).find(
        (app) =>
          matchesProject(app, projectId, projectTitle) &&
          (app.status === 'pending' || app.status === 'accepted'),
      ) ?? null
    );
  }
};

export const submitProjectApplication = async (
  userId: string,
  projectId: string,
  projectTitle: string,
): Promise<{ ok: boolean; message: string; application?: ProjectApplication }> => {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase не настроен. Заявку нельзя отправить.' };
  }

  try {
    await ensureAuthSession();

    const cached = readAppsCache(userId).find(
      (app) =>
        matchesProject(app, projectId, projectTitle) &&
        (app.status === 'pending' || app.status === 'accepted'),
    );
    if (cached?.status === 'pending') {
      return { ok: false, message: 'Заявка уже на рассмотрении. Смотрите статус в личном кабинете.' };
    }
    if (cached?.status === 'accepted') {
      return { ok: false, message: 'Вы уже приняты в этот проект.' };
    }

    const existing = await fetchApplicationForProject(userId, projectId, projectTitle);
    if (existing?.status === 'pending') {
      upsertAppsCache(userId, existing);
      return { ok: false, message: 'Заявка уже на рассмотрении. Смотрите статус в личном кабинете.' };
    }
    if (existing?.status === 'accepted') {
      upsertAppsCache(userId, existing);
      return { ok: false, message: 'Вы уже приняты в этот проект.' };
    }

    const { data, error } = await withTimeout(
      supabase
        .from('user_applications')
        .insert({
          user_id: userId,
          project_id: normalizeProjectId(projectId),
          project_title: projectTitle,
          status: 'pending',
        })
        .select(selectColumns)
        .single(),
    );

    if (error) {
      if (error.code === '23505') {
        return { ok: false, message: 'Заявка на этот проект уже существует.' };
      }
      return { ok: false, message: formatApplicationError(error) };
    }

    const application = data as ProjectApplication;
    upsertAppsCache(userId, application);

    return {
      ok: true,
      message: 'Заявка отправлена! Статус можно отслеживать в личном кабинете → Заявки.',
      application,
    };
  } catch (error) {
    return { ok: false, message: formatApplicationError(error) };
  }
};

export const cancelProjectApplication = async (
  userId: string,
  applicationId: string,
): Promise<{ ok: boolean; message: string }> => {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase не настроен.' };
  }

  try {
    await ensureAuthSession();

    const { error, count } = await withTimeout(
      supabase
        .from('user_applications')
        .delete({ count: 'exact' })
        .eq('id', applicationId)
        .eq('user_id', userId)
        .eq('status', 'pending'),
    );

    if (error) {
      return { ok: false, message: formatApplicationError(error) };
    }

    if (count === 0) {
      return { ok: false, message: 'Заявку нельзя отменить (возможно, она уже обработана).' };
    }

    removeFromAppsCache(userId, applicationId);
    return { ok: true, message: 'Заявка отменена.' };
  } catch (error) {
    return { ok: false, message: formatApplicationError(error) };
  }
};

export const invalidateApplicationsCache = (userId: string) => {
  try {
    sessionStorage.removeItem(appsCacheKey(userId));
  } catch {
    // ignore
  }
};
