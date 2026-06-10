import { SERVICES_LIST } from '../constants';
import { loadSiteEvents } from '../utils/resolveAiCard';
import { supabase } from './supabase';
import type { MyProjectDetail } from './projectService';

export type AiChatMode = 'city' | 'project' | 'complaint';

export const ASSISTANT_NAME = 'Проша';

export interface AiHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProjectBrief {
  linkedProjectId: string | null;
  title: string;
  description: string;
  stage: 'idea' | 'development' | 'mvp' | 'pitch';
  technologies: string[];
}

const STAGE_LABELS: Record<ProjectBrief['stage'], string> = {
  idea: 'Идея',
  development: 'В разработке',
  mvp: 'MVP готов',
  pitch: 'Готов к питчу',
};

export const MAX_SESSION_MESSAGES = 60;
export const MAX_HISTORY_FOR_API = 8;

/** Пороги предупреждений: осталось N сообщений */
export const SESSION_WARN_REMAINING = [15, 8, 3] as const;

export async function buildCityContext(): Promise<string> {
  const [projectsRes, servicesRes] = await Promise.all([
    supabase.from('projects').select('id, title, category, description').limit(50),
    supabase.from('services').select('id, title, category, description').limit(50),
  ]);

  const dbServices = servicesRes.data ?? [];
  const servicesSource = dbServices.length
    ? dbServices
    : SERVICES_LIST.map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        description: s.desc,
      }));

  const servicesList = servicesSource
    .map((s) => `ID:${s.id} | "${s.title}" | ${s.category} | ${s.description}`)
    .join('\n');

  const projectsList =
    projectsRes.data
      ?.map((p) => `ID:${p.id} | "${p.title}" | ${p.description}`)
      .join('\n') ?? '';

  const sections = `services — Цифровые сервисы (ЖКХ, ТТС, врач, школа)
projects — ИТ-проекты для участия
campus — Студентам
profile — Личный кабинет`;

  return `=== РАЗДЕЛЫ САЙТА (навигация: [[раздел:ID|Название]]) ===
${sections}

=== ЦИФРОВЫЕ СЕРВИСЫ ([[сервис:ID|Название]]) ===
${servicesList}

=== ИТ-ПРОЕКТЫ ([[проект:ID|Название]]) ===
${projectsList}`;
}

export async function buildEventsContext(): Promise<string> {
  const events = await loadSiteEvents();
  const relevant = events.filter((e) =>
    /стартап|чемпионат|хакатон|акселератор|конференц|конкурс|форум/i.test(
      `${e.tag} ${e.title}`,
    ),
  );
  return relevant
    .slice(0, 20)
    .map((e) => `ID:${e.id} | "${e.title}" | ${e.tag} | ССЫЛКА: ${e.link}`)
    .join('\n');
}

export interface ProjectAiContext {
  projectId?: string;
  title?: string;
  description?: string;
  problem?: string;
  expectedResult?: string;
  stage?: string;
  status?: string;
  direction?: string;
  technologies?: string[];
  neededRoles?: string[];
  teamName?: string;
  lookingForTeam?: boolean;
}

function extractInvokeError(data: unknown, error: { message?: string } | null): string {
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return String(data.error);
  }
  return error?.message || 'Ошибка AI-сервиса';
}

export async function sendAiMessage(params: {
  mode: AiChatMode;
  message: string;
  history?: AiHistoryMessage[];
  cityContext?: string;
  eventsContext?: string;
  projectContext?: ProjectAiContext;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      mode: params.mode,
      message: params.message,
      history: params.history?.slice(-MAX_HISTORY_FOR_API),
      cityContext: params.cityContext,
      eventsContext: params.eventsContext,
      projectContext: params.projectContext,
    },
  });

  if (error || (data && typeof data === 'object' && 'error' in data && data.error)) {
    throw new Error(extractInvokeError(data, error));
  }

  return (data as { reply?: string })?.reply ?? 'Не удалось получить ответ.';
}

export async function submitComplaint(params: {
  description: string;
  page?: string;
  userEmail?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      mode: 'complaint',
      message: '',
      complaint: params,
    },
  });

  if (error || (data && typeof data === 'object' && 'error' in data && data.error)) {
    throw new Error(extractInvokeError(data, error));
  }

  return (data as { reply?: string })?.reply ?? 'Жалоба отправлена.';
}

export function statusToStage(status: string): ProjectBrief['stage'] {
  const s = status.toLowerCase();
  if (/mvp|прототип/.test(s)) return 'mvp';
  if (/питч|защит/.test(s)) return 'pitch';
  if (/работ|разраб|внедр/.test(s)) return 'development';
  return 'idea';
}

export function myProjectToBrief(project: MyProjectDetail): ProjectBrief {
  return {
    linkedProjectId: project.id,
    title: project.title,
    description: [project.problem, project.description].filter(Boolean).join('\n\n'),
    stage: statusToStage(project.status),
    technologies: project.technologies ?? [],
  };
}

export function projectBriefToContext(brief: ProjectBrief, detail?: MyProjectDetail | null): ProjectAiContext {
  const base: ProjectAiContext = {
    projectId: brief.linkedProjectId ?? undefined,
    title: brief.title || undefined,
    description: brief.description || undefined,
    stage: STAGE_LABELS[brief.stage],
    technologies: brief.technologies.length ? brief.technologies : undefined,
  };

  if (detail) {
    return {
      ...base,
      problem: detail.problem || undefined,
      expectedResult: detail.expected_result || undefined,
      status: detail.status || undefined,
      direction: detail.direction || detail.category || undefined,
      neededRoles: detail.needed_roles?.length ? detail.needed_roles : undefined,
      teamName: detail.team_name || undefined,
      lookingForTeam: detail.looking_for_team || undefined,
    };
  }

  return base;
}

export function getSessionWarning(remaining: number): string | null {
  if (remaining === 15) {
    return `⚠️ ${ASSISTANT_NAME} напоминает: осталось 15 сообщений в этой сессии.`;
  }
  if (remaining === 8) {
    return `⚠️ Осталось 8 сообщений. Завершите важные вопросы или нажмите «Новая сессия».`;
  }
  if (remaining === 3) {
    return `🔔 Осталось 3 сообщения! Скоро лимит — сохраните идеи и начните новую сессию.`;
  }
  return null;
}

export const PROJECT_QUICK_PROMPTS = [
  { id: 'name', label: 'Название', icon: '✨', prompt: 'Предложи 3 варианта названия для моего проекта. Кратко объясни каждый.' },
  { id: 'desc', label: 'Описание', icon: '📝', prompt: 'Помоги сформулировать описание проекта: проблема, решение, целевая аудитория.' },
  { id: 'features', label: 'Функции', icon: '⚙️', prompt: 'Перечисли ключевые функции MVP (5–7 пунктов) для моего проекта.' },
  { id: 'tasks', label: 'Задачи', icon: '✅', prompt: 'Разбей проект на конкретные задачи для команды на ближайший месяц.' },
  { id: 'team', label: 'Команда', icon: '👥', prompt: 'Какие специалисты нужны для реализации? Укажи роли и навыки.' },
  { id: 'timeline', label: 'Таймлайн', icon: '📅', prompt: 'Составь реалистичный таймлайн на 8 недель. Формат строго: «Неделя N — конкретная задача». Учти стадию проекта и размер команды.' },
  { id: 'events', label: 'Конкурсы', icon: '🏆', prompt: 'Подбери подходящие конкурсы и мероприятия из базы сайта. Дай ссылки [[событие:ID|Название]] на реальные события.' },
  { id: 'chances', label: 'Шансы', icon: '📊', prompt: 'Оцени шансы на победу на студенческих конкурсах и дай 3 рекомендации по доработке.' },
] as const;

export const CITY_QUICK_PROMPTS = [
  'Записаться к врачу',
  'Пополнить ТТС',
  'Найти ИТ-проект',
  'Раздел сервисов',
] as const;
