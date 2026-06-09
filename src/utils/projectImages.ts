import { PROJECTS_LIST } from '../constants';

const baseUrl = import.meta.env.BASE_URL || './';

const localImage = (file: string) => `${baseUrl}project_images/${file}`.replace(/\/+/g, '/');

const LOCAL_BY_TITLE: Record<string, string> = {
  'SmartTraffic AI': localImage('traffic.jpg'),
  'EcoBin Sensors': localImage('ecology.jpg'),
  SolarBench: localImage('urban.jpg'),
  'HelpHand App': localImage('social.jpg'),
  SkyPatrol: localImage('safety.jpg'),
  'EduVR History': localImage('education.png'),
};

const LOCAL_BY_CATEGORY: Record<string, string> = {
  Транспорт: localImage('traffic.jpg'),
  Экология: localImage('ecology.jpg'),
  Урбанистика: localImage('urban.jpg'),
  Социальное: localImage('social.jpg'),
  Безопасность: localImage('safety.jpg'),
  Образование: localImage('education.png'),
};

const LOCAL_POOL = Object.values(LOCAL_BY_TITLE);

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
  return (
    lower.includes('city_logo') ||
    lower.includes('city-logo') ||
    lower.includes('unsplash.com') ||
    lower.includes('picsum.photos')
  );
};

export const resolveProjectImageUrl = (
  url: string | null | undefined,
  meta: { category?: string; id?: string | number; title?: string } = {},
) => {
  const title = meta.title?.trim();

  if (title && LOCAL_BY_TITLE[title]) return LOCAL_BY_TITLE[title];

  const fromList = PROJECTS_LIST.find(
    (p) =>
      (meta.id != null && String(p.id) === String(meta.id)) ||
      (title && p.title.toLowerCase() === title.toLowerCase()),
  );
  if (fromList?.title && LOCAL_BY_TITLE[fromList.title]) return LOCAL_BY_TITLE[fromList.title];

  if (url?.trim() && !isPlaceholderProjectImage(url)) return url.trim();

  const category = meta.category?.trim();
  if (category && LOCAL_BY_CATEGORY[category]) return LOCAL_BY_CATEGORY[category];

  const seed = String(meta.id ?? title ?? category ?? 'default');
  return LOCAL_POOL[hashString(seed) % LOCAL_POOL.length] || localImage('default.jpg');
};
