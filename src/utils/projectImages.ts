import { PROJECTS_LIST } from '../constants';

const baseUrl = import.meta.env.BASE_URL || './';

let manifestCache: Record<string, string> | null = {
  'SmartTraffic AI': '/project_images/bf04bcf2c9bb.jpg',
  'EcoBin Sensors': '/project_images/f5815adf413d.jpg',
  SolarBench: '/project_images/8d9f2735baef.jpg',
  'HelpHand App': '/project_images/d55114905f66.jpg',
  SkyPatrol: '/project_images/cf9cc369bf9c.jpg',
  'EduVR History': '/project_images/f53e000b64a0.jpg',
};

const normalizePath = (path: string) => {
  const cleaned = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}${cleaned}`.replace(/\/+/g, '/');
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/** Как в parsers/news_parser.py — стабильное фото с Picsum по seed. */
export const getPicsumStockUrl = (seed: string) =>
  `https://picsum.photos/seed/${hashString(seed)}/800/600`;

export const isPlaceholderProjectImage = (url?: string | null) => {
  if (!url?.trim()) return true;
  const lower = url.toLowerCase();
  return lower.includes('city_logo') || lower.includes('city-logo');
};

const manifestPathForTitle = (title: string) => {
  if (typeof window === 'undefined') return null;
  return manifestCache?.[title] ?? null;
};

export const preloadProjectImageManifest = async () => {
  if (manifestCache) return manifestCache;
  try {
    const url = normalizePath('project_images.json');
    const res = await fetch(url);
    if (res.ok) {
      manifestCache = (await res.json()) as Record<string, string>;
    }
  } catch {
    manifestCache = {};
  }
  return manifestCache ?? {};
};

export const resolveProjectImageUrl = (
  url: string | null | undefined,
  meta: { category?: string; id?: string | number; title?: string } = {},
) => {
  const title = meta.title?.trim();

  if (title) {
    const fromManifest = manifestPathForTitle(title);
    if (fromManifest) return normalizePath(fromManifest);
  }

  const fromList = PROJECTS_LIST.find(
    (p) =>
      (meta.id != null && String(p.id) === String(meta.id)) ||
      (title && p.title.toLowerCase() === title.toLowerCase()),
  );

  if (fromList?.title) {
    const manifestHit = manifestPathForTitle(fromList.title);
    if (manifestHit) return normalizePath(manifestHit);
  }

  if (url?.trim() && !isPlaceholderProjectImage(url)) {
    if (url.startsWith('http') || url.startsWith('data:')) return url.trim();
    return normalizePath(url);
  }

  const seed = title || fromList?.title || meta.category || String(meta.id ?? 'project');
  return getPicsumStockUrl(seed);
};
