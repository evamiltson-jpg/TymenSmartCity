import { SERVICES_LIST } from '../constants';
import { supabase } from '../services/supabase';

export interface ResolvedCard {
  title: string;
  desc: string;
  category: string;
  image: string;
  isService: boolean;
  buttonText: string;
  status?: string;
  url?: string;
}

export async function resolveServiceCard(id: string, label: string): Promise<ResolvedCard | null> {
  const local = SERVICES_LIST.find((s) => String(s.id) === String(id));
  if (local) {
    return {
      title: local.title,
      desc: local.desc,
      category: local.category,
      image: local.imageUrl,
      isService: true,
      buttonText: local.buttonText || 'Перейти',
      url: local.url,
    };
  }

  const { data } = await supabase.from('services').select('*').eq('id', id).maybeSingle();
  if (data) {
    const url = data.external_url || data.url || data.button_url || '';
    return {
      title: data.title ?? label,
      desc: data.description ?? '',
      category: data.category ?? 'Сервис',
      image: data.image_url ?? '',
      isService: true,
      buttonText: data.button_text || 'Перейти',
      url: url || undefined,
    };
  }

  return null;
}

export async function resolveProjectCard(id: string, label: string): Promise<ResolvedCard | null> {
  const { data } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (!data) return null;

  return {
    title: data.title ?? label,
    desc: data.description ?? '',
    category: data.category ?? data.direction ?? 'Проект',
    image: data.image_url ?? '',
    isService: false,
    buttonText: 'Подать заявку',
    status: data.status,
  };
}

export const SITE_SECTIONS: Record<string, { page: string; label: string }> = {
  services: { page: 'services', label: 'Цифровые сервисы' },
  projects: { page: 'projects', label: 'ИТ-проекты' },
  campus: { page: 'campus', label: 'Студентам' },
  profile: { page: 'profile', label: 'Личный кабинет' },
  home: { page: 'home', label: 'Главная' },
};

let eventsCache: Array<{ id: string; title: string; link: string; tag: string }> | null = null;

export async function loadSiteEvents() {
  if (eventsCache) return eventsCache;
  try {
    const base = import.meta.env.BASE_URL || './';
    const res = await fetch(`${base}events_data.json`);
    const data = await res.json();
    eventsCache = (data as Array<Record<string, string>>).map((e) => ({
      id: e.id,
      title: e.title,
      link: e.link,
      tag: e.tag,
    }));
    return eventsCache;
  } catch {
    eventsCache = [];
    return eventsCache;
  }
}

export async function resolveEventLink(id: string): Promise<string | null> {
  const events = await loadSiteEvents();
  const event = events.find((e) => e.id === id);
  return event?.link ?? null;
}
