export const PROJECT_STATUSES = [
  {
    value: 'Идея',
    label: 'Идея',
    hint: 'Проект на стадии замысла, идёт формулировка задачи.',
    color: 'bg-slate-500/25 text-slate-100 border-slate-400/50 ring-slate-400/30',
    dot: 'bg-slate-400',
  },
  {
    value: 'В разработке',
    label: 'В разработке',
    hint: 'Команда активно создаёт прототип или MVP.',
    color: 'bg-blue-500/25 text-blue-100 border-blue-400/50 ring-blue-400/30',
    dot: 'bg-blue-400',
  },
  {
    value: 'Тестирование',
    label: 'Тестирование',
    hint: 'Проверка на пользователях, пилот или бета-версия.',
    color: 'bg-purple-500/25 text-purple-100 border-purple-400/50 ring-purple-400/30',
    dot: 'bg-purple-400',
  },
  {
    value: 'Готов к внедрению',
    label: 'Готов к внедрению',
    hint: 'Решение готово к масштабированию или передаче заказчику.',
    color: 'bg-amber-500/25 text-amber-100 border-amber-400/50 ring-amber-400/30',
    dot: 'bg-amber-400',
  },
  {
    value: 'Внедрён',
    label: 'Внедрён',
    hint: 'Проект уже используется в реальной среде.',
    color: 'bg-emerald-500/25 text-emerald-100 border-emerald-400/50 ring-emerald-400/30',
    dot: 'bg-emerald-400',
  },
  {
    value: 'Приостановлен',
    label: 'Приостановлен',
    hint: 'Работа временно остановлена.',
    color: 'bg-rose-500/25 text-rose-100 border-rose-400/50 ring-rose-400/30',
    dot: 'bg-rose-400',
  },
] as const;

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

export const getStatusStyle = (status: string) =>
  PROJECT_STATUSES.find((item) => item.value === status)?.color ??
  'bg-white/10 text-gray-200 border-white/20 ring-white/10';
