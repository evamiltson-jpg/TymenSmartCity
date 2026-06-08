import { QuizResultPayload, QuizSkillScore } from '../utils/quizStorage';

export type TrackKey =
  | 'frontend'
  | 'backend'
  | 'design'
  | 'mobile'
  | 'datascience'
  | 'devops'
  | 'qa';

export type VerdictTone = 'great' | 'good' | 'mid' | 'weak' | 'bad' | 'critical';

export interface QuizOption {
  id: string;
  text: string;
  /** 1 = слабый/мимо, 4 = лучший ответ в задаче */
  quality: number;
  trackPoints: Partial<Record<TrackKey, number>>;
  skillPoints: Record<string, number>;
}

export interface QuizQuestion {
  id: number;
  text: string;
  description: string;
  multiSelect?: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: QuizOption[];
}

export interface QuizVerdict {
  title: string;
  text: string;
  roast?: string;
  tone: VerdictTone;
}

export const TRACK_DETAILS: Record<TrackKey, { title: string; skills: string[] }> = {
  frontend: { title: 'Frontend-разработчик', skills: ['React', 'TypeScript', 'JavaScript', 'HTML/CSS', 'UI-компоненты'] },
  backend: { title: 'Backend-разработчик', skills: ['Node.js', 'PostgreSQL', 'REST API', 'Архитектура', 'Docker'] },
  design: { title: 'UI/UX-дизайнер', skills: ['Figma', 'UX Research', 'Прототипирование', 'Design Systems', 'Usability'] },
  mobile: { title: 'Мобильный разработчик', skills: ['Flutter', 'Kotlin', 'Swift', 'React Native', 'Mobile UX'] },
  datascience: { title: 'Data Science & AI', skills: ['Python', 'SQL', 'Machine Learning', 'Pandas', 'Аналитика данных'] },
  devops: { title: 'DevOps-инженер', skills: ['Linux', 'Docker', 'CI/CD', 'Kubernetes', 'Мониторинг'] },
  qa: { title: 'QA-инженер', skills: ['Тест-дизайн', 'API Testing', 'Cypress', 'Автотесты', 'Нагрузочное тестирование'] },
};

const option = (
  id: string,
  text: string,
  track: TrackKey,
  skills: Record<string, number>,
  quality: number,
  extraTracks: Partial<Record<TrackKey, number>> = {},
): QuizOption => ({
  id,
  text,
  quality,
  trackPoints: { [track]: quality, ...extraTracks },
  skillPoints: skills,
});

const rawOption = (
  id: string,
  text: string,
  track: TrackKey,
  skills: Record<string, number>,
  quality: number,
): QuizOption => ({
  id,
  text,
  quality,
  trackPoints: { [track]: quality },
  skillPoints: skills,
});

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: 'Оптимизация дашборда с 10 000 точек данных',
    description: 'Пользователи жалуются на лаги в интерактивном дашборде Smart City. Что сделаете в первую очередь?',
    options: [
      option('1a', 'Виртуализация списка, мемоизация компонентов и lazy-render невидимых блоков', 'frontend', { React: 4, JavaScript: 3, 'UI-компоненты': 3 }, 4),
      option('1b', 'Пагинация API, индексы PostgreSQL и кэш агрегатов в Redis', 'backend', { PostgreSQL: 4, 'REST API': 3, Архитектура: 3 }, 4),
      option('1c', 'Пересоберу UX: группировка, фильтры, skeleton-состояния', 'design', { Figma: 3, Usability: 3, 'UX Research': 1 }, 2),
      option('1d', 'Даунсэмплинг временных рядов и feature engineering для графиков', 'datascience', { Python: 3, Pandas: 3, 'Аналитика данных': 2 }, 3),
    ],
  },
  {
    id: 2,
    text: 'Ошибка TypeError: Cannot read properties of undefined',
    description: 'После релиза часть пользователей видит белый экран. В логах ошибка чтения map у undefined.',
    options: [
      option('2a', 'Optional chaining, дефолтные состояния и Error Boundary на клиенте', 'frontend', { TypeScript: 4, React: 3, JavaScript: 3 }, 4),
      option('2b', 'Проверю DTO/Zod-схемы ответа API и строгую валидацию на сервере', 'backend', { 'REST API': 4, Архитектура: 3, 'Node.js': 2 }, 4),
      option('2c', 'Сделаю понятный экран ошибки и empty state', 'design', { Usability: 3, 'Прототипирование': 2 }, 2),
      option('2d', 'Воспроизведу баг, оформлю баг-репорт и добавлю автотест на регрессию', 'qa', { 'Тест-дизайн': 4, Cypress: 3, Автотесты: 3 }, 3),
    ],
  },
  {
    id: 3,
    text: 'Push-уведомления о ЧС в городе',
    description: 'Нужна система оповещений жителей о чрезвычайных ситуациях с минимальной задержкой.',
    options: [
      option('3a', 'UI-компонент алертов с приоритетами и доступностью A11y', 'frontend', { React: 2, 'UI-компоненты': 3 }, 2),
      option('3b', 'Событийная архитектура на Kafka/RabbitMQ и idempotent handlers', 'backend', { Архитектура: 4, 'Node.js': 3, 'REST API': 2 }, 4),
      option('3c', 'Интеграция FCM/APNs и фоновые задачи на Android/iOS', 'mobile', { Flutter: 3, Kotlin: 3, 'Mobile UX': 3 }, 4),
      option('3d', 'Настрою брокер, retention-политики и Grafana-дашборды очередей', 'devops', { Kubernetes: 3, Мониторинг: 4, Docker: 3 }, 3),
    ],
  },
  {
    id: 4,
    text: 'XSS в форме обратной связи',
    description: 'В поле формы обнаружена попытка внедрения скрипта для кражи cookie.',
    options: [
      option('4a', 'Экранирование вывода, безопасный рендер и CSP-заголовки', 'frontend', { JavaScript: 3, TypeScript: 3, React: 2 }, 3),
      option('4b', 'Санитизация входящих данных, ORM и HttpOnly-сессии', 'backend', { 'Node.js': 3, PostgreSQL: 2, 'REST API': 4 }, 4),
      option('4c', 'Проведу пентest формы и добавлю OWASP ZAP-сценарии', 'qa', { 'API Testing': 3, 'Тест-дизайн': 4, Автотесты: 2 }, 4),
      option('4d', 'Подключу WAF и сканирование Docker-образов через Trivy', 'devops', { Linux: 3, Docker: 4, Мониторинг: 2 }, 3),
    ],
  },
  {
    id: 5,
    text: 'Интеграция оплаты проезда',
    description: 'Нужно подключить платежный шлюз для бесконтактной оплаты в приложении города.',
    options: [
      option('5a', 'Платежный виджет, 3DS-редиректы и экраны статусов транзакции', 'frontend', { React: 3, JavaScript: 3, 'UI-компоненты': 3 }, 3),
      option('5b', 'Webhook-обработчик, идемпотентность и журнал транзакций', 'backend', { 'Node.js': 4, 'REST API': 4, PostgreSQL: 3 }, 4),
      option('5c', 'Apple Pay / Google Pay / СБП через нативные SDK', 'mobile', { Swift: 3, Kotlin: 3, 'React Native': 3 }, 4),
      option('5d', 'Изоляция платежного контура в VPC под PCI DSS', 'devops', { Docker: 3, Kubernetes: 3, Linux: 3 }, 3),
    ],
  },
  {
    id: 6,
    text: 'Legacy-модуль авторизации',
    description: 'Старый модуль auth без тестов ломается после каждого обновления зависимостей.',
    options: [
      option('6a', 'Постепенный перевод на TypeScript и unit-тесты критичных функций', 'frontend', { TypeScript: 3, JavaScript: 2 }, 2),
      option('6b', 'Интеграционные тесты API и рефакторинг под OAuth 2.0', 'backend', { 'Node.js': 4, Архитектура: 4 }, 4),
      option('6c', 'Карта регрессии и автотесты login-flow в Playwright', 'qa', { Автотесты: 4, Cypress: 3, 'Тест-дизайн': 3 }, 4),
      option('6d', 'Упакую legacy в контейнер с фиксированной версией runtime', 'devops', { Docker: 3, Linux: 2, 'CI/CD': 2 }, 2),
    ],
  },
  {
    id: 7,
    text: 'Рост базы экодатчиков',
    description: 'База датчиков растет на 50 ГБ в неделю, запросы истории за месяц занимают 10+ секунд.',
    options: [
      option('7a', 'Lazy loading, ограничение периода и подгрузка по скроллу', 'frontend', { React: 2, JavaScript: 2 }, 1),
      option('7b', 'Партиционирование таблиц или TimescaleDB для time-series', 'backend', { PostgreSQL: 4, Архитектура: 4 }, 4),
      option('7c', 'Сжатие временных рядов и архивная агрегация', 'datascience', { Python: 3, Pandas: 4, SQL: 3 }, 4),
      option('7d', 'Read-replicas и перенос аналитики на отдельные инстансы', 'devops', { Kubernetes: 3, Мониторинг: 3, Linux: 3 }, 3),
    ],
  },
  {
    id: 8,
    text: 'Размытые требования к маршрутизатору',
    description: 'Заказчик хочет «умный маршрутизатор», но не может описать функции конкретно.',
    options: [
      option('8a', 'Быстрый UI-прототип на mock-данных для согласования сценариев', 'frontend', { React: 2, 'UI-компоненты': 2 }, 2),
      option('8b', 'Проверю OSRM/OpenRouteService и алгоритмы на графах', 'backend', { Архитектура: 3, 'REST API': 3, SQL: 2 }, 3),
      option('8c', 'Интервью пользователей, personas и user flow в Figma', 'design', { 'UX Research': 4, Figma: 4, Usability: 3 }, 4),
      option('8d', 'Соберу геоданные и прототип ML-модели ETA с учетом пробок', 'datascience', { 'Machine Learning': 3, Python: 2, SQL: 2 }, 2),
    ],
  },
  {
    id: 9,
    text: 'CI/CD для студенческого проекта',
    description: 'Команда часто ломает main при merge. Нужен надежный процесс поставки.',
    options: [
      option('9a', 'Lint + typecheck + preview deploy для каждого PR', 'frontend', { TypeScript: 3, React: 2 }, 2, { devops: 1 }),
      option('9b', 'Контрактные тесты API и миграции БД в pipeline', 'backend', { 'Node.js': 3, PostgreSQL: 3 }, 2, { devops: 1 }),
      option('9c', 'GitHub Actions / GitLab CI, staging и rollback strategy', 'devops', { 'CI/CD': 4, Docker: 4, Kubernetes: 2 }, 4),
      option('9d', 'Smoke/regression suite перед релизом', 'qa', { Автотесты: 4, 'Тест-дизайн': 3 }, 3, { devops: 1 }),
    ],
  },
  {
    id: 10,
    text: 'A/B тест новой карты города',
    description: 'Нужно понять, какая версия карты увеличивает вовлеченность пользователей.',
    options: [
      option('10a', 'Внедрю event tracking и feature flags на клиенте', 'frontend', { JavaScript: 3, React: 3, 'UI-компоненты': 2 }, 3),
      option('10b', 'Спроектирую эксперимент, метрики и хранение результатов', 'backend', { SQL: 3, Архитектура: 3, PostgreSQL: 2 }, 3),
      option('10c', 'Подготовлю две UX-концепции и проведу usability-тест', 'design', { 'UX Research': 4, Usability: 4, Figma: 3 }, 4),
      option('10d', 'Построю воронку, когортный анализ и статистическую значимость', 'datascience', { 'Аналитика данных': 4, Python: 3, SQL: 3 }, 4),
    ],
  },
  {
    id: 11,
    text: 'Какие задачи вам ближе всего?',
    description: 'Можно выбрать до 3 вариантов — отметьте то, что нравится делать на практике.',
    multiSelect: true,
    minSelect: 1,
    maxSelect: 3,
    options: [
      option('11a', 'Сверстать адаптивный интерфейс и довести UX до pixel-perfect', 'frontend', { React: 3, 'HTML/CSS': 4 }, 4),
      option('11b', 'Спроектировать API, схему БД и бизнес-логику сервиса', 'backend', { 'REST API': 4, PostgreSQL: 3 }, 4),
      option('11c', 'Провести UX-исследование и собрать дизайн-систему', 'design', { Figma: 4, 'Design Systems': 4 }, 4),
      option('11d', 'Настроить пайплайн, контейнеры и мониторинг инфраструктуры', 'devops', { 'CI/CD': 4, Docker: 3 }, 4),
      option('11e', 'Написать автотесты и воспроизвести сложные баги', 'qa', { Автотесты: 4, Cypress: 3 }, 4),
      option('11f', 'Обучить модель и подготовить аналитический отчет', 'datascience', { 'Machine Learning': 4, Python: 3 }, 4),
    ],
  },
  {
    id: 12,
    text: 'Какие инструменты вы уже использовали?',
    description: 'Отметьте знакомые технологии — чем меньше выбрано, тем ниже будет оценка опыта.',
    multiSelect: true,
    minSelect: 1,
    maxSelect: 4,
    options: [
      rawOption('12a', 'React / Vue / Angular', 'frontend', { React: 4, JavaScript: 2 }, 4),
      rawOption('12b', 'Node.js / NestJS / Django', 'backend', { 'Node.js': 4, 'REST API': 2 }, 4),
      rawOption('12c', 'Figma / Miro / UX-тесты', 'design', { Figma: 4, 'UX Research': 2 }, 4),
      rawOption('12d', 'Docker / Kubernetes / Linux', 'devops', { Docker: 3, Kubernetes: 3, Linux: 2 }, 4),
      rawOption('12e', 'Python / SQL / Jupyter', 'datascience', { Python: 3, SQL: 3, Pandas: 2 }, 4),
      rawOption('12f', 'Postman / Cypress / Jest', 'qa', { 'API Testing': 3, Cypress: 3, Автотесты: 2 }, 4),
      rawOption('12g', 'Flutter / Kotlin / Swift', 'mobile', { Flutter: 3, Kotlin: 2, Swift: 2 }, 4),
      rawOption('12h', 'Пока ничего из списка — только учусь', 'frontend', {}, 1),
    ],
  },
];

const MAX_QUALITY = 4;

const getQuestionScore = (selected: QuizOption[], question: QuizQuestion): number => {
  if (selected.length === 0) return 0;

  const avgQuality =
    selected.reduce((sum, item) => sum + item.quality, 0) / selected.length;

  let score = (avgQuality / MAX_QUALITY) * 100;

  if (question.multiSelect && question.id === 12) {
    const hasOnlyPlaceholder = selected.some((item) => item.id === '12h');
    if (hasOnlyPlaceholder) return 8;
    const coveragePenalty = Math.max(0, (question.minSelect || 1) - selected.length) * 12;
    score = Math.max(0, score - coveragePenalty);
  }

  return Math.round(score);
};

const computeOverallScore = (answers: QuizOption[][]): number => {
  const perQuestion = answers.map((selected, index) =>
    getQuestionScore(selected, QUIZ_QUESTIONS[index]),
  );
  return Math.round(perQuestion.reduce((sum, value) => sum + value, 0) / perQuestion.length);
};

const computeTrackScores = (answers: QuizOption[][]): Record<string, number> => {
  const trackScores: Record<string, number> = {};

  answers.forEach((selected) => {
    selected.forEach((item) => {
      Object.entries(item.trackPoints).forEach(([track, points]) => {
        trackScores[track] = (trackScores[track] || 0) + (points || 0) * (item.quality / MAX_QUALITY);
      });
    });
  });

  return trackScores;
};

const computeSkillScoresForTrack = (
  answers: QuizOption[][],
  track: TrackKey,
): QuizSkillScore[] => {
  const trackSkills = TRACK_DETAILS[track].skills;
  const earned: Record<string, number> = {};
  const maximum: Record<string, number> = {};

  QUIZ_QUESTIONS.forEach((question) => {
    const bestPerSkill: Record<string, number> = {};

    question.options.forEach((opt) => {
      const factor = opt.quality / MAX_QUALITY;
      Object.entries(opt.skillPoints).forEach(([skill, points]) => {
        if (!trackSkills.includes(skill)) return;
        bestPerSkill[skill] = Math.max(bestPerSkill[skill] || 0, points * factor);
      });
    });

    Object.entries(bestPerSkill).forEach(([skill, value]) => {
      maximum[skill] = (maximum[skill] || 0) + value;
    });
  });

  answers.forEach((selected) => {
    selected.forEach((opt) => {
      const factor = opt.quality / MAX_QUALITY;
      Object.entries(opt.skillPoints).forEach(([skill, points]) => {
        if (!trackSkills.includes(skill)) return;
        earned[skill] = (earned[skill] || 0) + points * factor;
      });
    });
  });

  return trackSkills
    .map((skill) => {
      const max = maximum[skill] || 1;
      const value = earned[skill] || 0;
      const score = Math.round(Math.min(100, (value / max) * 100));
      return { name: skill, score };
    })
    .sort((a, b) => b.score - a.score);
};

export const formatOverallVerdict = (overallScore: number): QuizVerdict => {
  if (overallScore >= 85) {
    return {
      title: 'Сильный результат',
      text: 'Ответы показывают уверенное мышление инженера. Можно браться за реальные задачи.',
      tone: 'great',
    };
  }
  if (overallScore >= 70) {
    return {
      title: 'Хороший уровень',
      text: 'База есть, решения в целом здравые. Ещё немного практики — и совсем огонь.',
      tone: 'good',
    };
  }
  if (overallScore >= 50) {
    return {
      title: 'Средний уровень',
      text: 'Часть решений мимо сути задачи. Есть понимание, но системности пока не хватает.',
      tone: 'mid',
    };
  }
  if (overallScore >= 35) {
    return {
      title: 'Слабовато',
      text: 'Много ответов «не в ту сторону». Без доработки базы на серьёзные задачи рано.',
      roast: 'Пока что уровень «гуглить и надеяться» — но это хотя бы честный старт.',
      tone: 'weak',
    };
  }
  if (overallScore >= 20) {
    return {
      title: 'Ниже порога',
      text: 'Результат честно говорит: навыков для выбранного направления пока мало.',
      roast: 'Без обид: сейчас это скорее «я в IT, но IT во мне слабо дружит».',
      tone: 'bad',
    };
  }
  return {
    title: 'Критический уровень',
    text: 'Оценка без скидок: для ИТ-задач база практически не прослеживается.',
    roast: 'Если показывать кому-то — будет видно сразу. Пора садиться за учебу всерьёз, без самообмана.',
    tone: 'critical',
  };
};

export const formatSkillScoreLabel = (score: number) => {
  if (score >= 86) return 'Продвинутый';
  if (score >= 71) return 'Уверенный';
  if (score >= 51) return 'Рабочий';
  if (score >= 36) return 'Слабый';
  if (score >= 21) return 'Очень слабый';
  return 'Критический пробел';
};

export const getScoreBarColor = (score: number) => {
  if (score >= 71) return 'from-yellow-500 to-yellow-300';
  if (score >= 51) return 'from-lime-500 to-yellow-400';
  if (score >= 36) return 'from-orange-500 to-amber-400';
  return 'from-red-600 to-red-400';
};

export const getVerdictAccentClass = (tone: VerdictTone) => {
  switch (tone) {
    case 'great':
    case 'good':
      return 'text-green-400 border-green-500/30 bg-green-500/10';
    case 'mid':
      return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    case 'weak':
      return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    default:
      return 'text-red-400 border-red-500/30 bg-red-500/10';
  }
};

export const computeQuizResult = (answers: QuizOption[][]): QuizResultPayload => {
  const overallScore = computeOverallScore(answers);
  const verdict = formatOverallVerdict(overallScore);
  const trackScores = computeTrackScores(answers);

  const bestTrack = (Object.entries(trackScores).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'frontend') as TrackKey;
  const trackInfo = TRACK_DETAILS[bestTrack];
  const skillScores = computeSkillScoresForTrack(answers, bestTrack);
  const formattedSkills = skillScores.map((item) => `${item.name} — ${item.score}%`);

  return {
    specialty: trackInfo.title,
    track: bestTrack,
    skills: formattedSkills,
    skillScores,
    overallScore,
    verdictTitle: verdict.title,
    verdictText: verdict.text,
    verdictRoast: verdict.roast,
    verdictTone: verdict.tone,
    completedAt: new Date().toISOString(),
    attempt: 0,
  };
};
