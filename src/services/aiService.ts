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
    return `[Внимание] Осталось 15 сообщений в этой сессии.`;
  }
  if (remaining === 8) {
    return `[Внимание] Осталось 8 сообщений. Завершите важные вопросы или начните новую сессию.`;
  }
  if (remaining === 3) {
    return `[Внимание] Осталось 3 сообщения — скоро лимит сессии.`;
  }
  return null;
}

export const PROJECT_QUICK_PROMPTS = [
  {
    id: 'name',
    label: 'Название',
    userText: 'Предложи варианты названия',
    apiPrompt:
      'Предложи 3 варианта названия. По одному предложению к каждому. В конце строка {{предложение|title|лучший вариант}}.',
  },
  {
    id: 'desc',
    label: 'Описание',
    userText: 'Помоги с описанием проекта',
    apiPrompt:
      'Сформулируй описание: проблема, решение, аудитория. В конце {{предложение|description|краткое описание}}.',
  },
  {
    id: 'features',
    label: 'Функции',
    userText: 'Какие функции нужны в MVP?',
    apiPrompt: 'Перечисли 5–7 ключевых функций MVP маркированным списком (* пункт).',
  },
  {
    id: 'tasks',
    label: 'Задачи',
    userText: 'Разбей проект на задачи',
    apiPrompt: 'Разбей работу на задачи команды на ближайший месяц. Список (* пункт).',
  },
  {
    id: 'team',
    label: 'Команда',
    userText: 'Какие роли нужны в команде?',
    apiPrompt: 'Какие роли и навыки нужны в команде? Список (* роль — навыки).',
  },
  {
    id: 'tech',
    label: 'Технологии',
    userText: 'Какие технологии лучше использовать?',
    apiPrompt:
      'Какие технологии лучше взять для этого проекта? Объясни простыми словами. Список (* технология — зачем). В конце: {{предложение|technologies|React, TypeScript, Python}}.',
  },
  {
    id: 'timeline',
    label: 'Таймлайн',
    userText: 'Составь таймлайн на 8 недель',
    apiPrompt: 'Составь таймлайн на 8 недель. Формат: «Неделя N — задача».',
  },
  {
    id: 'events',
    label: 'Конкурсы',
    userText: 'Какие конкурсы подойдут?',
    apiPrompt: 'Подбери 2–4 подходящих конкурса из базы. Ссылки [[событие:ID|Название]].',
  },
  {
    id: 'chances',
    label: 'Шансы',
    userText: 'Оцени шансы на конкурсах',
    apiPrompt: 'Оцени шансы на конкурсах и дай 3 рекомендации по доработке.',
  },
] as const;

export const CITY_QUICK_PROMPTS = [
  'Записаться к врачу',
  'Пополнить ТТС',
  'Найти ИТ-проект',
  'Раздел сервисов',
] as const;
