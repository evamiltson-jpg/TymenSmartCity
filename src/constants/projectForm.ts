export const PROJECT_STATUSES = [
  {
    value: 'Идея',
    label: 'Идея',
    hint: 'Проект на стадии замысла, идёт формулировка задачи.',
    color: 'bg-slate-600/40 text-slate-100 border-slate-400/60 ring-slate-400/40',
    dot: 'bg-slate-300',
  },
  {
    value: 'В разработке',
    label: 'В разработке',
    hint: 'Команда активно создаёт прототип или MVP.',
    color: 'bg-blue-600/40 text-blue-100 border-blue-400/60 ring-blue-400/40',
    dot: 'bg-blue-400',
  },
  {
    value: 'Тестирование',
    label: 'Тестирование',
    hint: 'Проверка на пользователях, пилот или бета-версия.',
    color: 'bg-purple-600/40 text-purple-100 border-purple-400/60 ring-purple-400/40',
    dot: 'bg-purple-400',
  },
  {
    value: 'Готов к внедрению',
    label: 'Готов к внедрению',
    hint: 'Решение готово к масштабированию или передаче заказчику.',
    color: 'bg-amber-600/40 text-amber-100 border-amber-400/60 ring-amber-400/40',
    dot: 'bg-amber-400',
  },
  {
    value: 'Внедрён',
    label: 'Внедрён',
    hint: 'Проект уже используется в реальной среде.',
    color: 'bg-emerald-600/40 text-emerald-100 border-emerald-400/60 ring-emerald-400/40',
    dot: 'bg-emerald-400',
  },
  {
    value: 'Приостановлен',
    label: 'Приостановлен',
    hint: 'Работа временно остановлена.',
    color: 'bg-rose-600/40 text-rose-100 border-rose-400/60 ring-rose-400/40',
    dot: 'bg-rose-400',
  },
] as const;

const STATUS_ALIASES: Record<string, string> = {
  'В работе': 'В разработке',
  Завершено: 'Внедрён',
  Приостановлено: 'Приостановлен',
};

export const normalizeProjectStatus = (status: string) => STATUS_ALIASES[status] ?? status;

export const PROJECT_DIRECTIONS = [
  'Цифровизация',
  'Образование',
  'Экология',
  'Транспорт',
  'Здравоохранение',
  'Социальные проекты',
  'Предпринимательство',
  'Городская среда',
  'Культура и медиа',
  'Спорт и ЗОЖ',
  'Безопасность',
  'ЖКХ и коммунальные услуги',
  'Наука и R&D',
  'Искусственный интеллект',
  'Мобильные приложения',
  'IoT и умные устройства',
  'Госуслуги',
  'Другое',
] as const;

export const TASKS_BY_DIRECTION: Record<string, string[]> = {
  Цифровизация: ['Автоматизация процессов', 'Портал/личный кабинет', 'Аналитика данных', 'ИИ-решение', 'Другое'],
  Образование: ['Обучающая платформа', 'Профориентация', 'Научный проект', 'Студенческий сервис', 'Другое'],
  Экология: ['Переработка отходов', 'Экомониторинг', 'Энергосбережение', 'Озеленение', 'Другое'],
  Транспорт: ['Маршрутизация', 'БДД', 'Общественный транспорт', 'Микромобильность', 'Другое'],
  Здравоохранение: ['Профилактика', 'Телемедицина', 'ЗОЖ', 'Доступность услуг', 'Другое'],
  'Социальные проекты': ['Волонтёрство', 'Инклюзия', 'Поддержка семей', 'Гражданское участие', 'Другое'],
  Предпринимательство: ['Стартап', 'Маркетплейс', 'B2B-сервис', 'Франшиза', 'Другое'],
  'Городская среда': ['Благоустройство', 'Урбанистика', 'Общественные пространства', 'Освещение', 'Другое'],
  'Культура и медиа': ['Медиапроект', 'Фестиваль', 'Арт-инициатива', 'Контент-платформа', 'Другое'],
  'Спорт и ЗОЖ': ['Спортивное приложение', 'Тренировочный сервис', 'Питание', 'Мероприятия', 'Другое'],
  Безопасность: ['Мониторинг', 'Оповещения', 'Видеоаналитика', 'Кибербезопасность', 'Другое'],
  'ЖКХ и коммунальные услуги': ['Учёт ресурсов', 'Заявки жителей', 'Умный дом', 'Энергоэффективность', 'Другое'],
  'Наука и R&D': ['Лабораторный проект', 'Публикация', 'Прототип', 'Исследование данных', 'Другое'],
  'Искусственный интеллект': ['Чат-бот', 'Классификация', 'Рекомендации', 'Компьютерное зрение', 'Другое'],
  'Мобильные приложения': ['iOS/Android', 'Кроссплатформа', 'PWA', 'Геосервис', 'Другое'],
  'IoT и умные устройства': ['Датчики', 'Автоматизация', 'Робототехника', 'Умный город', 'Другое'],
  Госуслуги: ['Электронные услуги', 'Документооборот', 'Обратная связь', 'Прозрачность', 'Другое'],
  Другое: ['Своя задача'],
};

export const TECHNOLOGY_PRESETS = [
  'React',
  'TypeScript',
  'JavaScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Node.js',
  'PostgreSQL',
  'Supabase',
  'Firebase',
  'Flutter',
  'React Native',
  'Arduino',
  'Raspberry Pi',
  'IoT',
  'Machine Learning',
  'Computer Vision',
  'NLP',
  'Docker',
  'Figma',
  'Unity',
  'GIS',
  'Excel / VBA',
  '1С',
  'TensorFlow',
  'PyTorch',
  'REST API',
  'GraphQL',
  'Blockchain',
] as const;

export const VACANCY_ROLE_PRESETS = [
  'Frontend-разработчик',
  'Backend-разработчик',
  'Fullstack-разработчик',
  'Mobile-разработчик',
  'UI/UX дизайнер',
  'Product-менеджер',
  'Аналитик данных',
  'ML-инженер',
  'Тестировщик',
  'DevOps',
  'Маркетолог',
  'Контент-менеджер',
  'Исследователь',
  'Юрист',
  'Финансист',
] as const;

export const PROJECT_REVIEW_STATUSES = [
  {
    value: 'На модерации',
    label: 'На модерации',
    tone: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  },
  {
    value: 'Принят',
    label: 'Принят',
    tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    value: 'Отклонён',
    label: 'Отклонён',
    tone: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
  },
  {
    value: 'Удалён',
    label: 'Удалён',
    tone: 'text-gray-400 bg-white/5 border-white/10',
  },
] as const;

export type ProjectReviewStatus = (typeof PROJECT_REVIEW_STATUSES)[number]['value'];

export const getReviewStatusStyle = (status: string) =>
  PROJECT_REVIEW_STATUSES.find((item) => item.value === status)?.tone ??
  'text-gray-300 bg-white/5 border-white/10';

export const getStatusStyle = (status: string) => {
  const normalized = normalizeProjectStatus(status);
  return (
    PROJECT_STATUSES.find((item) => item.value === normalized)?.color ??
    'bg-white/15 text-gray-200 border-white/25 ring-white/15'
  );
};

export const getStatusDot = (status: string) => {
  const normalized = normalizeProjectStatus(status);
  return PROJECT_STATUSES.find((item) => item.value === normalized)?.dot ?? 'bg-gray-400';
};
