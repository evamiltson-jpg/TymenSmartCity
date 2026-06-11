export const INITIATIVE_CATEGORIES = [
  'Транспорт',
  'ЖКХ',
  'Экология',
  'Безопасность',
  'Образование',
  'Здравоохранение',
  'Благоустройство',
  'Досуг',
  'Другое',
] as const;

export type InitiativeCategory = (typeof INITIATIVE_CATEGORIES)[number];

export type InitiativeStatus =
  | 'pending'
  | 'in_review'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  pending: 'На рассмотрении',
  in_review: 'Рассматривается',
  accepted: 'Принято',
  in_progress: 'В работе',
  completed: 'Реализовано',
  rejected: 'Отклонено',
};

export const INITIATIVE_STATUS_COLORS: Record<InitiativeStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  in_review: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  accepted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const INITIATIVE_PHOTO_LIMITS = {
  maxFiles: 3,
  maxBytes: 5 * 1024 * 1024,
  accept: 'image/jpeg,image/png,image/webp',
  label: '5 МБ',
} as const;
