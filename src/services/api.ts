import * as CONSTANTS from '../constants';
import { NewsArticle, ProjectData, StudentStory, CampusTeam, CampusEvent, Member, Resource, ServiceItem } from '../types';
import { supabase } from './supabase';

const NEWS_CACHE_TTL_MS = 5 * 60_000;
let newsCache: { at: number; data: NewsArticle[] } | null = null;
let universityNewsCache: { at: number; data: NewsArticle[] } | null = null;

const db = {
  get: (key: string, defaultValue: any) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }
};

export const ApiService = {
  
  async getNews(): Promise<NewsArticle[]> {
    if (newsCache && Date.now() - newsCache.at < NEWS_CACHE_TTL_MS) {
      return newsCache.data;
    }

    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const cleanPath = (path: string) => (baseUrl + path).replace(/\/+/g, '/');

      const [cityRes, itRes] = await Promise.all([
        fetch(cleanPath('news_data.json')).then((res) => (res.ok ? res.json() : [])),
        fetch(cleanPath('it_news_data.json')).then((res) => (res.ok ? res.json() : [])),
      ]);

      const combinedNews = [...cityRes, ...itRes];

      if (combinedNews.length > 0) {
        const mapped = combinedNews.map((item: any) => ({
          ...item,
          imageUrl:
            item.imageUrl && item.imageUrl.startsWith('/')
              ? cleanPath(item.imageUrl.substring(1))
              : item.imageUrl || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800',
        }));
        newsCache = { at: Date.now(), data: mapped };
        return mapped;
      }

      return CONSTANTS.NEWS_ARTICLES;
    } catch (error) {
      console.error('Ошибка при чтении JSON новостей:', error);
      return CONSTANTS.NEWS_ARTICLES;
    }
  },

  async getUniversityNews(): Promise<NewsArticle[]> {
    if (universityNewsCache && Date.now() - universityNewsCache.at < NEWS_CACHE_TTL_MS) {
      return universityNewsCache.data;
    }

    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const cleanPath = (path: string) => (baseUrl + path).replace(/\/+/g, '/');

      const response = await fetch(cleanPath('university_news_data.json'));
      if (!response.ok) return [];

      const items = await response.json();
      const mapped = (items as NewsArticle[]).map((item) => ({
        ...item,
        imageUrl:
          item.imageUrl && item.imageUrl.startsWith('/')
            ? cleanPath(item.imageUrl.substring(1))
            : item.imageUrl || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800',
      }));
      universityNewsCache = { at: Date.now(), data: mapped };
      return mapped;
    } catch (error) {
      console.error('Ошибка загрузки новостей вузов:', error);
      return [];
    }
  },

  async getProjects(): Promise<ProjectData[]> {
    const raw = db.get('projects_full', CONSTANTS.PROJECTS_LIST) as any[];
    // Приводим к единой структуре, ожидаемой компонентами
    return (raw || []).map(p => ({
      id: p.id,
      title: p.title || p.name || '',
      description: p.description || p.desc || p.summary || '',
      image_url: (p as any).image_url || (p as any).imageUrl || (p as any).image || '',
      votes: p.votes ?? p.rating ?? 0,
      status: p.status || 'В работе',
      category: p.category || p.tags?.[0] || 'Без категории',
      // сохраним остальные поля на всякий случай
      ...p
    })) as ProjectData[];
  },

  async getServices(): Promise<ServiceItem[]> {
    const services = ((CONSTANTS as any).SERVICES_LIST || []) as any[];

    return services.map((service: any, index: number) => ({
      id: service.id ?? index + 1,
      title: service.title || 'Без названия',
      category: service.category || 'Другое',
      description: service.description || service.desc || '',
      imageUrl: service.imageUrl || service.image_url || '',
      buttonText: service.buttonText || service.button_text || 'Подробнее',
      url: service.url || '#',
    }));
  },

  async getCampusData() {
    return {
      stories: db.get('student_stories', CONSTANTS.STUDENT_STORIES) as StudentStory[],
      teams: db.get('campus_teams', CONSTANTS.CAMPUS_TEAMS) as CampusTeam[],
      events: db.get('campus_events', CONSTANTS.CAMPUS_EVENTS) as CampusEvent[],
      resources: db.get('campus_resources', CONSTANTS.STUDENT_RESOURCES) as Resource[]
    };
  },

  async getManagementStructure() {
    return {
      council: db.get('council_members', CONSTANTS.COUNCIL_MEMBERS) as Member[],
      committee: db.get('committee_members', CONSTANTS.COMMITTEE_MEMBERS) as Member[],
      monitoring: db.get('monitoring_members', CONSTANTS.MONITORING_MEMBERS) as Member[]
    };
  },

  async getUserProfile() {
    return db.get('user_profile', CONSTANTS.USER_PROFILE);
  },

  // ДОБАВИЛИ ФУНКЦИЮ ПОДАЧИ ЗАЯВКИ НА СЕМИНАРЫ / ХАКАТОНЫ В БАЗУ ДАННЫХ
  async submitApplication(userId: string, projectId: string | number, projectTitle: string) {
    try {
      const { data, error } = await supabase
        .from('user_applications')
        .insert({
          user_id: userId,
          project_id: String(projectId), // Приводим ID к строке
          project_title: projectTitle,
          status: 'pending' // По умолчанию "На рассмотрении"
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Ошибка при подаче заявки:', error);
      return { success: false, error: error.message };
    }
  }
};