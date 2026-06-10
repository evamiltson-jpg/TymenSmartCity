import { supabase } from './supabase';

export type AiChatMode = 'city' | 'project' | 'complaint';

export interface AiHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProjectBrief {
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

export const MAX_SESSION_MESSAGES = 20;
export const MAX_HISTORY_FOR_API = 8;

export async function buildCityContext(): Promise<string> {
  const [projectsRes, servicesRes] = await Promise.all([
    supabase.from('projects').select('id, title, category, description').limit(50),
    supabase.from('services').select('id, title, category, description').limit(50),
  ]);

  const servicesList =
    servicesRes.data
      ?.map((s) => `ID:${s.id} | НАЗВАНИЕ: "${s.title}" | СУТЬ: ${s.description}`)
      .join('\n') ?? '';

  const projectsList =
    projectsRes.data
      ?.map((p) => `ID:${p.id} | НАЗВАНИЕ: "${p.title}" | СУТЬ: ${p.description}`)
      .join('\n') ?? '';

  return `=== ГОРОДСКИЕ СЕРВИСЫ ===
${servicesList}

=== ИТ-ПРОЕКТЫ ===
${projectsList}`;
}

export async function sendAiMessage(params: {
  mode: AiChatMode;
  message: string;
  history?: AiHistoryMessage[];
  cityContext?: string;
  projectContext?: {
    title?: string;
    description?: string;
    stage?: string;
    technologies?: string[];
  };
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      mode: params.mode,
      message: params.message,
      history: params.history?.slice(-MAX_HISTORY_FOR_API),
      cityContext: params.cityContext,
      projectContext: params.projectContext,
    },
  });

  if (error) {
    throw new Error(error.message || 'Ошибка AI-сервиса');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.reply ?? 'Не удалось получить ответ.';
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

  if (error) {
    throw new Error(error.message || 'Не удалось отправить жалобу');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.reply ?? 'Жалоба отправлена.';
}

export function projectBriefToContext(brief: ProjectBrief) {
  return {
    title: brief.title || undefined,
    description: brief.description || undefined,
    stage: STAGE_LABELS[brief.stage],
    technologies: brief.technologies.length ? brief.technologies : undefined,
  };
}

export const PROJECT_QUICK_PROMPTS = [
  { id: 'name', label: 'Название', icon: '✨', prompt: 'Предложи 3 варианта названия для моего проекта. Кратко объясни каждый.' },
  { id: 'desc', label: 'Описание', icon: '📝', prompt: 'Помоги сформулировать описание проекта: проблема, решение, целевая аудитория.' },
  { id: 'features', label: 'Функции', icon: '⚙️', prompt: 'Перечисли ключевые функции MVP (5–7 пунктов) для моего проекта.' },
  { id: 'tasks', label: 'Задачи', icon: '✅', prompt: 'Разбей проект на конкретные задачи для команды на ближайший месяц.' },
  { id: 'team', label: 'Команда', icon: '👥', prompt: 'Какие специалисты нужны для реализации? Укажи роли и навыки.' },
  { id: 'timeline', label: 'Таймлайн', icon: '📅', prompt: 'Составь таймлайн проекта на 8–12 недель с ключевыми вехами.' },
  { id: 'events', label: 'Конкурсы', icon: '🏆', prompt: 'Какие конференции, хакатоны или конкурсы подходят для этого проекта в России?' },
  { id: 'chances', label: 'Шансы', icon: '📊', prompt: 'Оцени шансы на победу на студенческих конкурсах и дай 3 рекомендации по доработке.' },
] as const;

export const CITY_QUICK_PROMPTS = [
  'Как записаться к врачу?',
  'Найти ИТ-проект для участия',
  'Городские сервисы для жителей',
  'Сообщить об ошибке на сайте',
] as const;
