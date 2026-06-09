import { PROJECTS_LIST } from '../constants';
import { getStatusStyle, PROJECT_REVIEW_STATUSES } from '../constants/projectForm';
import { isSupabaseConfigured, supabase } from './supabase';
import type { ProjectData } from '../types';

export const REVIEW_STATUS = {
  MODERATION: 'На модерации',
  ACCEPTED: 'Принят',
  REJECTED: 'Отклонён',
  DELETED: 'Удалён',
} as const;

const PROJECT_IMAGE_LIMIT_BYTES = 3 * 1024 * 1024;
const PROJECT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PUBLIC_PROJECT_LIMIT = 48;
const HOME_TOP_PROJECTS_LIMIT = 8;
const READ_RETRY_DELAY_MS = 500;
const PROMOTE_INTERVAL_MS = 60_000;
const PROJECTS_CACHE_TTL_MS = 120_000;
const STORAGE_CACHE_TTL_MS = 300_000;
const SITE_STORAGE_KEY = 'tsc_site_projects_v2';
const submittedCacheKey = (userId: string) => `tsc_submitted_${userId}`;

let lastPromoteAt = 0;
let siteProjectsCache: { at: number; data: ProjectData[] } | null = null;
let siteRefreshPromise: Promise<ProjectData[]> | null = null;
const myProjectDetailCache = new Map<string, { at: number; data: MyProjectDetail }>();
const MY_PROJECT_CACHE_TTL_MS = 60_000;

const readStorageCache = <T>(key: string, ttlMs: number): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: T };
    if (Date.now() - parsed.at > ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

const writeStorageCache = <T>(key: string, data: T) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // sessionStorage может быть недоступен
  }
};

export const readSubmittedProjectsCache = (userId: string): SubmittedProject[] | null =>
  readStorageCache<SubmittedProject[]>(submittedCacheKey(userId), STORAGE_CACHE_TTL_MS);

const isNetworkError = (error: unknown) => {
  if (typeof error !== 'object' || !error || !('message' in error)) return false;
  const message = String((error as { message: string }).message).toLowerCase();
  return /failed to fetch|network|connection reset|err_connection|timeout|заняло слишком много времени/i.test(
    message,
  );
};

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const runWithRetry = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isNetworkError(error) || attempt === retries) throw error;
      await delay(READ_RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError;
};

const runReadQuery = async <T>(query: () => Promise<T>): Promise<T> => runWithRetry(query, 2);

export const ensureAuthSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (session?.access_token) return session;

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
  if (!refreshed.session) throw new Error('Требуется вход в аккаунт');
  return refreshed.session;
};

export const invalidateProjectsCache = () => {
  siteProjectsCache = null;
  siteRefreshPromise = null;
  try {
    sessionStorage.removeItem(SITE_STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const invalidateSubmittedProjectsCache = (userId: string) => {
  try {
    sessionStorage.removeItem(submittedCacheKey(userId));
  } catch {
    // ignore
  }
};

export const invalidateMyProjectDetailCache = (projectId?: string) => {
  if (projectId) {
    myProjectDetailCache.delete(projectId);
    return;
  }
  myProjectDetailCache.clear();
};

const baseUrl = import.meta.env.BASE_URL || '/';
export const LOCAL_PROJECT_IMAGE = `${baseUrl}assets/City_logo.png`.replace(/\/+/g, '/');

const LIST_COLUMNS =
  'id, title, description, category, status, image_url, author_name, team_name, co_authors, technologies, votes, rating';

export interface UserTeamOption {
  team_id: string;
  team_name: string;
}

export interface ProjectInsertPayload {
  created_by: string;
  title: string;
  problem: string;
  description: string;
  expected_result: string;
  direction: string;
  custom_direction?: string | null;
  task?: string | null;
  custom_task?: string | null;
  economic_effect?: number | null;
  note?: string | null;
  category: string;
  author_name: string;
  co_authors: string[];
  ready_to_implement: boolean;
  team_id?: string | null;
  team_name: string;
  rating_enabled: boolean;
  image_url: string;
  status: string;
  technologies: string[];
  looking_for_team: boolean;
  needed_roles: string[];
  vacancy_note?: string | null;
  votes?: number;
  rating?: number;
}

export interface SubmittedProject {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  created_at: string;
  published_at: string | null;
  moderation_status: string | null;
  moderationLabel: string;
  moderationHint: string;
  isOnSite: boolean;
}

export interface MyProjectDetail {
  id: string;
  title: string;
  problem: string;
  description: string;
  expected_result: string;
  direction: string;
  custom_direction?: string | null;
  task?: string | null;
  custom_task?: string | null;
  economic_effect?: number | null;
  note?: string | null;
  category: string;
  author_name: string;
  co_authors: string[];
  ready_to_implement: boolean;
  team_name: string;
  rating_enabled: boolean;
  image_url: string;
  status: string;
  technologies: string[];
  looking_for_team: boolean;
  needed_roles: string[];
  vacancy_note?: string | null;
  votes: number;
  rating: number;
  published_at: string | null;
  moderation_status: string | null;
  is_on_site: boolean;
  created_at: string;
}

export interface MyProjectUpdatePayload {
  title: string;
  problem: string;
  description: string;
  expected_result: string;
  note?: string | null;
  category: string;
  status: string;
}

const MY_PROJECT_COLUMNS =
  'id, title, problem, description, expected_result, direction, custom_direction, task, custom_task, economic_effect, note, category, author_name, co_authors, ready_to_implement, team_name, rating_enabled, image_url, status, technologies, looking_for_team, needed_roles, vacancy_note, votes, rating, published_at, moderation_status, is_on_site, created_at';

const LIST_COLUMNS_MINIMAL =
  'id, title, description, category, direction, status, image_url, author_name, team_name, co_authors, technologies, votes, rating, created_at';

const SUBMITTED_COLUMNS_MINIMAL = 'id, title, description, status, category, created_at';

const mapListToProjectData = (project: (typeof PROJECTS_LIST)[number]): ProjectData => ({
  id: String(project.id),
  title: project.title,
  status: project.status,
  statusColor: getStatusStyle(project.status),
  category: project.category,
  rating: project.rating,
  votes: project.votes,
  desc: project.desc,
  tags: project.tags,
  team: project.team,
  participants: project.participants,
  imageUrl: getProjectImageUrl(project.imageUrl),
  projectType: project.projectType,
});

export const getSiteProjectsFallback = (): ProjectData[] => PROJECTS_LIST.map(mapListToProjectData);

const sortByRating = (projects: ProjectData[]) =>
  [...projects].sort((a, b) => b.rating - a.rating || b.votes - a.votes);

export const getTopRatedProjectsFallback = (limit = HOME_TOP_PROJECTS_LIMIT): ProjectData[] =>
  sortByRating(getSiteProjectsFallback()).slice(0, limit);

const schedulePromoteDueProjects = () => {
  if (!isSupabaseConfigured) return;
  const now = Date.now();
  if (now - lastPromoteAt < PROMOTE_INTERVAL_MS) return;
  lastPromoteAt = now;
  void supabase.rpc('promote_due_projects').catch((error) => {
    console.warn('promote_due_projects:', error);
  });
};

export interface ProjectSearchFilters {
  query?: string;
  author?: string;
  participant?: string;
  direction?: string;
  technology?: string;
  status?: string;
}

export const getProjectImageUrl = (url?: string | null) => {
  if (!url || url.includes('unsplash.com')) return LOCAL_PROJECT_IMAGE;
  return url;
};

export const isProjectOnSite = (row: {
  moderation_status?: string | null;
  is_on_site?: boolean | null;
}) =>
  row.moderation_status === REVIEW_STATUS.ACCEPTED && Boolean(row.is_on_site);

export const getProjectModerationInfo = (row: {
  published_at?: string | null;
  moderation_status?: string | null;
  is_on_site?: boolean | null;
}) => {
  const status = row.moderation_status || REVIEW_STATUS.MODERATION;
  const tone =
    PROJECT_REVIEW_STATUSES.find((item) => item.value === status)?.tone ??
    'text-gray-300 bg-white/5 border-white/10';

  if (status === REVIEW_STATUS.DELETED) {
    return { label: status, tone, hint: 'Проект удалён и скрыт с сайта' };
  }

  if (status === REVIEW_STATUS.REJECTED) {
    return { label: status, tone, hint: 'Проект отклонён модерацией' };
  }

  if (isProjectOnSite(row)) {
    return { label: 'На сайте', tone, hint: 'Проект виден в портфолио и поиске' };
  }

  if (status === REVIEW_STATUS.ACCEPTED) {
    return { label: status, tone, hint: 'Принят, но скрыт с сайта (is_on_site = 0)' };
  }

  const publishAt = row.published_at ? new Date(row.published_at) : null;
  const minutesLeft = publishAt
    ? Math.max(1, Math.ceil((publishAt.getTime() - Date.now()) / 60000))
    : 60;

  return {
    label: status,
    tone,
    hint:
      minutesLeft >= 60
        ? `Появится на сайте примерно через ${Math.ceil(minutesLeft / 60)} ч`
        : `Появится на сайте примерно через ${minutesLeft} мин`,
  };
};

export const formatProjectError = (error: unknown): string => {
  if (!error) return 'Неизвестная ошибка';

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message: string }).message);
    if (/заняло слишком много времени/i.test(message)) {
      return 'Сервер отвечает медленно. Проверьте личный кабинет — проект мог сохраниться. Не нажимайте «Создать» повторно.';
    }
    if (/failed to fetch|network|connection reset|err_connection/i.test(message)) {
      return 'Сбой соединения с Supabase. Проверьте интернет или VPN. Если проект появился в профиле — повторно не отправляйте.';
    }
    return message;
  }

  return 'Неизвестная ошибка';
};

const isColumnError = (error: unknown) => {
  if (typeof error !== 'object' || !error || !('message' in error)) return false;
  const message = String((error as { message: string }).message);
  return /column|schema|does not exist/i.test(message);
};

const normalizeRow = (row: Record<string, unknown>): ProjectData => {
  const coAuthors = Array.isArray(row.co_authors) ? (row.co_authors as string[]) : [];
  const technologies = Array.isArray(row.technologies) ? (row.technologies as string[]) : [];
  const status = String(row.status || 'Идея');

  return {
    id: String(row.id),
    title: String(row.title || ''),
    status,
    statusColor: getStatusStyle(status),
    category: String(row.category || row.direction || 'Без категории'),
    rating: Number(row.rating ?? 0),
    votes: Number(row.votes ?? 0),
    desc: String(row.description || ''),
    tags: technologies,
    team: String(row.team_name || row.author_name || 'Команда'),
    participants: 1 + coAuthors.length,
    imageUrl: getProjectImageUrl(String(row.image_url || '')),
    projectType: 'city',
  };
};

const querySiteProjects = async (columns: string, limit = PUBLIC_PROJECT_LIMIT) => {
  schedulePromoteDueProjects();

  const { data, error } = await runReadQuery(() =>
    supabase
      .from('projects')
      .select(columns)
      .eq('is_on_site', true)
      .eq('moderation_status', REVIEW_STATUS.ACCEPTED)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit),
  );

  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map((row) => normalizeRow(row));
};

const loadSiteProjects = async (limit = PUBLIC_PROJECT_LIMIT): Promise<ProjectData[]> => {
  if (!isSupabaseConfigured) {
    return limit < PUBLIC_PROJECT_LIMIT ? getTopRatedProjectsFallback(limit) : getSiteProjectsFallback();
  }

  try {
    const projects = await querySiteProjects(LIST_COLUMNS, limit);
    if (projects.length > 0) return projects;
    return limit < PUBLIC_PROJECT_LIMIT ? getTopRatedProjectsFallback(limit) : getSiteProjectsFallback();
  } catch (error) {
    if (isColumnError(error)) {
      const projects = await querySiteProjects(LIST_COLUMNS_MINIMAL, limit);
      if (projects.length > 0) return projects;
    } else {
      console.error('fetchProjects:', error);
    }
    return limit < PUBLIC_PROJECT_LIMIT ? getTopRatedProjectsFallback(limit) : getSiteProjectsFallback();
  }
};

const refreshSiteProjects = async (): Promise<ProjectData[]> => {
  if (siteRefreshPromise) return siteRefreshPromise;

  siteRefreshPromise = (async () => {
    const projects = sortByRating(await loadSiteProjects(PUBLIC_PROJECT_LIMIT));
    siteProjectsCache = { at: Date.now(), data: projects };
    writeStorageCache(SITE_STORAGE_KEY, projects);
    return projects;
  })().finally(() => {
    siteRefreshPromise = null;
  });

  return siteRefreshPromise;
};

export const fetchProjects = async (): Promise<ProjectData[]> => {
  if (siteProjectsCache && Date.now() - siteProjectsCache.at < PROJECTS_CACHE_TTL_MS) {
    return siteProjectsCache.data;
  }

  const stored = readStorageCache<ProjectData[]>(SITE_STORAGE_KEY, STORAGE_CACHE_TTL_MS);
  if (stored?.length) {
    siteProjectsCache = { at: Date.now(), data: stored };
    void refreshSiteProjects().catch((error) => console.warn('Фоновое обновление проектов:', error));
    return stored;
  }

  return refreshSiteProjects();
};

export const fetchTopRatedProjects = async (limit = HOME_TOP_PROJECTS_LIMIT): Promise<ProjectData[]> => {
  const projects = await fetchProjects();
  return projects.slice(0, limit);
};

export const searchProjects = async (filters: ProjectSearchFilters): Promise<ProjectData[]> => {
  const hasFilters = Boolean(
    filters.query?.trim() ||
      filters.author?.trim() ||
      filters.participant?.trim() ||
      filters.direction?.trim() ||
      filters.technology?.trim() ||
      filters.status?.trim(),
  );

  if (!hasFilters) {
    return fetchProjects();
  }

  schedulePromoteDueProjects();

  let query = supabase
    .from('projects')
    .select(LIST_COLUMNS)
    .eq('is_on_site', true)
    .eq('moderation_status', REVIEW_STATUS.ACCEPTED)
    .order('rating', { ascending: false, nullsFirst: false })
    .order('votes', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(PUBLIC_PROJECT_LIMIT);

  if (filters.direction) query = query.ilike('direction', `%${filters.direction}%`);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.query?.trim()) query = query.ilike('title', `%${filters.query.trim()}%`);
  if (filters.author?.trim()) query = query.ilike('author_name', `%${filters.author.trim()}%`);

  const { data, error } = await runReadQuery(() => query);
  if (error) throw error;

  let rows = (data || []) as Record<string, unknown>[];

  if (filters.participant?.trim()) {
    const needle = filters.participant.trim().toLowerCase();
    rows = rows.filter((row) => {
      const coAuthors = Array.isArray(row.co_authors) ? (row.co_authors as string[]) : [];
      return coAuthors.some((name) => name.toLowerCase().includes(needle));
    });
  }

  if (filters.technology?.trim()) {
    const needle = filters.technology.trim().toLowerCase();
    rows = rows.filter((row) => {
      const technologies = Array.isArray(row.technologies) ? (row.technologies as string[]) : [];
      return technologies.some((tech) => tech.toLowerCase().includes(needle));
    });
  }

  return rows.map((row) => normalizeRow(row));
};

const mapSubmittedRow = (row: {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  category?: string | null;
  created_at: string;
  published_at?: string | null;
  moderation_status?: string | null;
  is_on_site?: boolean | null;
}): SubmittedProject => {
  const moderation = getProjectModerationInfo(row);
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    status: row.status || 'Идея',
    category: row.category || '',
    created_at: row.created_at,
    published_at: row.published_at ?? null,
    moderation_status: row.moderation_status ?? null,
    moderationLabel: moderation.label,
    moderationHint: moderation.hint,
    isOnSite: isProjectOnSite(row),
  };
};

export const fetchMySubmittedProjects = async (userId: string): Promise<SubmittedProject[]> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase не настроен. Проверьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.');
  }

  const cached = readSubmittedProjectsCache(userId);

  const fullSelect =
    'id, title, description, status, category, created_at, published_at, moderation_status, is_on_site';

  const run = async (columns: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Требуется вход в аккаунт');

    const { data, error } = await runReadQuery(() =>
      supabase
        .from('projects')
        .select(columns)
        .eq('created_by', userId)
        .neq('moderation_status', REVIEW_STATUS.DELETED)
        .order('created_at', { ascending: false })
        .limit(50),
    );

    if (error) throw error;
    return (data || []).map((row) => mapSubmittedRow(row as Parameters<typeof mapSubmittedRow>[0]));
  };

  try {
    const rows = await run(fullSelect);
    writeStorageCache(submittedCacheKey(userId), rows);
    return rows;
  } catch (error) {
    if (cached?.length) return cached;
    if (!isColumnError(error)) throw error;
    const rows = await run(SUBMITTED_COLUMNS_MINIMAL);
    writeStorageCache(submittedCacheKey(userId), rows);
    return rows;
  }
};

const normalizeMyProject = (row: Record<string, unknown>): MyProjectDetail => ({
  id: String(row.id),
  title: String(row.title || ''),
  problem: String(row.problem || ''),
  description: String(row.description || ''),
  expected_result: String(row.expected_result || ''),
  direction: String(row.direction || ''),
  custom_direction: row.custom_direction ? String(row.custom_direction) : null,
  task: row.task ? String(row.task) : null,
  custom_task: row.custom_task ? String(row.custom_task) : null,
  economic_effect: row.economic_effect != null ? Number(row.economic_effect) : null,
  note: row.note ? String(row.note) : null,
  category: String(row.category || ''),
  author_name: String(row.author_name || ''),
  co_authors: Array.isArray(row.co_authors) ? (row.co_authors as string[]) : [],
  ready_to_implement: Boolean(row.ready_to_implement),
  team_name: String(row.team_name || ''),
  rating_enabled: row.rating_enabled !== false,
  image_url: getProjectImageUrl(String(row.image_url || '')),
  status: String(row.status || 'Идея'),
  technologies: Array.isArray(row.technologies) ? (row.technologies as string[]) : [],
  looking_for_team: Boolean(row.looking_for_team),
  needed_roles: Array.isArray(row.needed_roles) ? (row.needed_roles as string[]) : [],
  vacancy_note: row.vacancy_note ? String(row.vacancy_note) : null,
  votes: Number(row.votes ?? 0),
  rating: Number(row.rating ?? 0),
  published_at: row.published_at ? String(row.published_at) : null,
  moderation_status: row.moderation_status ? String(row.moderation_status) : null,
  is_on_site: Boolean(row.is_on_site),
  created_at: String(row.created_at || ''),
});

export const fetchMyProjectById = async (projectId: string, userId: string): Promise<MyProjectDetail | null> => {
  const cached = myProjectDetailCache.get(projectId);
  if (cached && Date.now() - cached.at < MY_PROJECT_CACHE_TTL_MS) {
    return cached.data;
  }

  const { data, error } = await runReadQuery(() =>
    supabase
      .from('projects')
      .select(MY_PROJECT_COLUMNS)
      .eq('id', projectId)
      .eq('created_by', userId)
      .maybeSingle(),
  );

  if (error) throw error;
  if (!data) return null;

  const project = normalizeMyProject(data as Record<string, unknown>);
  myProjectDetailCache.set(projectId, { at: Date.now(), data: project });
  return project;
};

export const updateMyProject = async (
  projectId: string,
  userId: string,
  payload: MyProjectUpdatePayload,
) => {
  const { error } = await supabase
    .from('projects')
    .update({
      title: payload.title.trim(),
      problem: payload.problem.trim(),
      description: payload.description.trim(),
      expected_result: payload.expected_result.trim(),
      note: payload.note?.trim() || null,
      category: payload.category.trim(),
      status: payload.status,
    })
    .eq('id', projectId)
    .eq('created_by', userId);

  if (error) throw error;
  invalidateMyProjectDetailCache(projectId);
};

export const deleteMyProject = async (projectId: string, userId: string) => {
  const { error } = await supabase
    .from('projects')
    .update({
      moderation_status: REVIEW_STATUS.DELETED,
      is_on_site: false,
    })
    .eq('id', projectId)
    .eq('created_by', userId);

  if (error) throw error;
  invalidateMyProjectDetailCache(projectId);
};

export const fetchUserTeams = async (userId: string): Promise<UserTeamOption[]> => {
  const { data, error } = await supabase
    .from('user_teams')
    .select('team_id, team_name')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((item) => ({
    team_id: item.team_id,
    team_name: item.team_name || 'Команда',
  }));
};

const compressProjectImage = (file: File, maxWidth = 720, quality = 0.68): Promise<File> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Не удалось обработать изображение'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Не удалось сжать изображение'));
            return;
          }
          resolve(new File([blob], `project-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать изображение'));
    };

    image.src = objectUrl;
  });

export const uploadProjectImage = async (userId: string, file: File): Promise<string> => {
  if (!PROJECT_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Допустимы только JPG, PNG или WebP.');
  }
  if (file.size > PROJECT_IMAGE_LIMIT_BYTES) {
    throw new Error('Изображение должно быть не больше 3 МБ.');
  }

  await ensureAuthSession();

  const compressed = await compressProjectImage(file);
  const path = `${userId}/project-${Date.now()}.jpg`;

  await runWithRetry(async () => {
    const result = await supabase.storage.from('project-images').upload(path, compressed, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });
    if (result.error) throw result.error;
    return result;
  }, 2);

  const { data } = supabase.storage.from('project-images').getPublicUrl(path);
  return data.publicUrl;
};

export const updateProjectImage = async (projectId: string, userId: string, file: File) => {
  const imageUrl = await uploadProjectImage(userId, file);
  const { error } = await supabase
    .from('projects')
    .update({ image_url: imageUrl })
    .eq('id', projectId)
    .eq('created_by', userId);

  if (error) throw error;
  return imageUrl;
};

const buildInsertPayload = (payload: ProjectInsertPayload, clientRequestId: string) => {
  const publishedAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  return {
    created_by: payload.created_by,
    title: payload.title,
    problem: payload.problem,
    description: payload.description,
    expected_result: payload.expected_result,
    direction: payload.direction,
    task: payload.task ?? null,
    economic_effect: payload.economic_effect ?? null,
    note: payload.note ?? null,
    category: payload.category,
    author_name: payload.author_name,
    co_authors: payload.co_authors,
    ready_to_implement: payload.ready_to_implement,
    team_id: payload.team_id ?? null,
    team_name: payload.team_name,
    rating_enabled: payload.rating_enabled,
    image_url: payload.image_url || LOCAL_PROJECT_IMAGE,
    status: payload.status,
    technologies: payload.technologies,
    looking_for_team: payload.looking_for_team,
    needed_roles: payload.needed_roles,
    vacancy_note: payload.vacancy_note ?? null,
    votes: payload.votes ?? 0,
    rating: payload.rating ?? 0,
    moderation_status: REVIEW_STATUS.MODERATION,
    is_on_site: false,
    published_at: publishedAt,
    client_request_id: clientRequestId,
    ...(payload.custom_direction ? { custom_direction: payload.custom_direction } : {}),
    ...(payload.custom_task ? { custom_task: payload.custom_task } : {}),
  };
};

const findProjectByClientRequestId = async (clientRequestId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('client_request_id', clientRequestId)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string } | null;
};

const insertProjectRow = async (row: Record<string, unknown>) => {
  const { data, error } = await supabase.from('projects').insert([row]).select('id').single();

  if (error?.code === '23505' && row.client_request_id) {
    const existing = await findProjectByClientRequestId(String(row.client_request_id));
    if (existing) return existing;
  }

  if (error) throw error;
  return data as { id: string };
};

export const createProject = async (payload: ProjectInsertPayload, clientRequestId: string) => {
  await ensureAuthSession();

  const full = buildInsertPayload({ ...payload, image_url: payload.image_url || LOCAL_PROJECT_IMAGE }, clientRequestId);

  const minimal: Record<string, unknown> = { ...full };
  delete minimal.technologies;
  delete minimal.looking_for_team;
  delete minimal.needed_roles;
  delete minimal.vacancy_note;
  delete minimal.custom_direction;
  delete minimal.custom_task;
  delete minimal.problem;
  delete minimal.expected_result;
  delete minimal.economic_effect;

  const core: Record<string, unknown> = {
    created_by: full.created_by,
    title: full.title,
    description: full.description,
    category: full.category,
    team_name: full.team_name,
    status: full.status,
    image_url: LOCAL_PROJECT_IMAGE,
    author_name: full.author_name,
    co_authors: full.co_authors,
    rating_enabled: full.rating_enabled,
    votes: 0,
    rating: 0,
    client_request_id: clientRequestId,
    moderation_status: REVIEW_STATUS.MODERATION,
    is_on_site: false,
    published_at: full.published_at,
  };

  const recoverCreatedProject = async () => {
    const existing = await findProjectByClientRequestId(clientRequestId);
    if (existing) return existing;
    return null;
  };

  let created: { id: string };
  try {
    created = await insertProjectRow(full as Record<string, unknown>);
  } catch (error) {
    if (isNetworkError(error)) {
      const recovered = await recoverCreatedProject();
      if (recovered) {
        created = recovered;
      } else if (!isColumnError(error)) {
        throw error;
      } else {
        created = await insertProjectRow(minimal);
      }
    } else if (!isColumnError(error)) {
      throw error;
    } else {
      try {
        created = await insertProjectRow(minimal);
      } catch (minimalError) {
        if (isNetworkError(minimalError)) {
          const recovered = await recoverCreatedProject();
          if (recovered) {
            created = recovered;
          } else {
            throw minimalError;
          }
        } else if (!isColumnError(minimalError)) {
          throw minimalError;
        } else {
          created = await insertProjectRow(core);
        }
      }
    }
  }

  invalidateProjectsCache();
  invalidateSubmittedProjectsCache(String(full.created_by));
  return created;
};

export const attachProjectImage = async (projectId: string, userId: string, file: File) => {
  const imageUrl = await updateProjectImage(projectId, userId, file);
  invalidateMyProjectDetailCache(projectId);
  invalidateSubmittedProjectsCache(userId);
  return imageUrl;
};

export interface TeamCreatePayload {
  team_name: string;
  mission: string;
  linked_project?: string;
  required_skills: string[];
  looking_for?: string;
}

export const createProjectTeam = async (userId: string, payload: TeamCreatePayload) => {
  const descriptionParts = [
    payload.mission.trim(),
    payload.linked_project?.trim() ? `Проект: ${payload.linked_project.trim()}` : '',
    payload.required_skills.length ? `Навыки: ${payload.required_skills.join(', ')}` : '',
    payload.looking_for?.trim() ? `Ищем: ${payload.looking_for.trim()}` : '',
  ].filter(Boolean);

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      team_name: payload.team_name.trim(),
      description: descriptionParts.join('\n'),
      created_by: userId,
    })
    .select()
    .single();

  if (teamError) throw teamError;

  const { error: memberError } = await supabase.from('user_teams').insert({
    user_id: userId,
    team_id: team.id,
    team_name: payload.team_name.trim(),
    member_count: 1,
  });

  if (memberError) throw memberError;
  return team;
};
