import { PROJECTS_LIST } from '../constants';

const STOCK_POOL = PROJECTS_LIST.map((p) => p.imageUrl).filter(Boolean);

const STOCK_BY_CATEGORY: Record<string, string> = {
  Транспорт: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
  Экология: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
  Урбанистика: 'https://images.unsplash.com/photo-1557310717-d6bea9f36682?auto=format&fit=crop&w=800&q=80',
  Социальное: 'https://images.unsplash.com/photo-1559027615-cd91459a397e?auto=format&fit=crop&w=800&q=80',
  Безопасность: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=800&q=80',
  Образование: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=800&q=80',
  Цифровизация: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  ЖКХ: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const isPlaceholderProjectImage = (url?: string | null) => {
  if (!url?.trim()) return true;
  const lower = url.toLowerCase();
  return lower.includes('city_logo') || lower.includes('city-logo');
};

export const resolveProjectImageUrl = (
  url: string | null | undefined,
  meta: { category?: string; id?: string | number; title?: string } = {},
) => {
  if (url?.trim() && !isPlaceholderProjectImage(url)) return url.trim();

  const title = meta.title?.trim();
  const fromList = PROJECTS_LIST.find(
    (p) =>
      (meta.id != null && String(p.id) === String(meta.id)) ||
      (title && p.title.toLowerCase() === title.toLowerCase()),
  );
  if (fromList?.imageUrl) return fromList.imageUrl;

  const category = meta.category?.trim();
  if (category && STOCK_BY_CATEGORY[category]) return STOCK_BY_CATEGORY[category];

  const seed = String(meta.id ?? title ?? category ?? 'default');
  return STOCK_POOL[hashString(seed) % STOCK_POOL.length] || STOCK_POOL[0];
};
