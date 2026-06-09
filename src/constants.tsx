import React from 'react';
import imgJkh from './assets/jkh.png';
import imgTts from './assets/tts.png';
import imgMySchool from './assets/myschool.png';
import imgHill from './assets/hill.png';
import imgGosuslygi from './assets/gosyslygi.jpg';
import imgTymenHous from './assets/tymen_hous.jpg';
import imgDop from './assets/dop.jpg';
import imgParking from './assets/parking.jpg';
import { 
  ProjectData, 
  StudentStory, 
  CampusTeam, 
  CampusEvent, 
  Resource, 
  NewsArticle, 
  EventItem, 
  ManagementStep, 
  Member, 
  ServiceItem 
  
} from './types';

export const PROJECTS_LIST: ProjectData[] = [
  {
    id: 1,
    title: 'SmartTraffic AI',
    status: 'В разработке',
    statusColor: 'bg-blue-600',
    category: 'Транспорт',
    rating: 4.7,
    votes: 345,
    desc: 'Интеллектуальная система управления светофорами на перекрёстках Тюмени. Камеры анализируют плотность потока в реальном времени, а алгоритм машинного обучения перестраивает фазы светофоров, сокращая заторы на ключевых магистралях до 18%. Пилот запущен на трёх перекрёстках в центре города.',
    tags: ['Python', 'Computer Vision', 'IoT'],
    team: 'RoadMasters',
    participants: 5,
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    projectType: 'city',
  },
  {
    id: 2,
    title: 'EcoBin Sensors',
    status: 'Тестирование',
    statusColor: 'bg-purple-600',
    category: 'Экология',
    rating: 3.9,
    votes: 54,
    desc: 'Сеть IoT-датчиков на контейнерах для твёрдых коммунальных отходов. Ультразвуковые сенсоры передают уровень заполнения в диспетчерскую, а маршрутизатор строит оптимальные маршруты мусоровозов. Экономия топлива — до 22%, снижение переполнений — на 40% в тестовых дворах.',
    tags: ['Arduino', 'Node.js', 'IoT'],
    team: 'CleanCity',
    participants: 3,
    imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    projectType: 'city',
  },
  {
    id: 3,
    title: 'SolarBench',
    status: 'Внедрён',
    statusColor: 'bg-emerald-600',
    category: 'Урбанистика',
    rating: 4.5,
    votes: 32,
    desc: 'Умные городские скамейки с солнечными панелями, подогревом сидений и беспроводными зарядками. Уже установлены в скверах на улице Республики и у набережной Туры. Скамейки собирают данные о погоде и загруженности, помогая планировать благоустройство общественных пространств.',
    tags: ['Solar', 'React', 'GIS'],
    team: 'SunRise',
    participants: 4,
    imageUrl: 'https://images.unsplash.com/photo-1557310717-d6bea9f36682?auto=format&fit=crop&w=800&q=80',
    projectType: 'commercial',
  },
  {
    id: 4,
    title: 'HelpHand App',
    status: 'В разработке',
    statusColor: 'bg-blue-600',
    category: 'Социальное',
    rating: 4.1,
    votes: 2132,
    desc: 'Мобильное приложение-агрегатор волонтёрских заданий: помощь пожилым, уборка дворов, организация мероприятий. Рейтинговая система и цифровые бейджи мотивируют активистов, а НКО получают удобный инструмент для набора помощников. Более 2 000 жителей уже зарегистрировались в бета-версии.',
    tags: ['React Native', 'Supabase', 'TypeScript'],
    team: 'GoodHearts',
    participants: 6,
    imageUrl: 'https://images.unsplash.com/photo-1559027615-cd91459a397e?auto=format&fit=crop&w=800&q=80',
    projectType: 'city',
  },
  {
    id: 5,
    title: 'SkyPatrol',
    status: 'Приостановлен',
    statusColor: 'bg-rose-600',
    category: 'Безопасность',
    rating: 3.9,
    votes: 687,
    desc: 'Автономные дроны с тепловизорами для раннего обнаружения лесных пожаров в пригороде Тюмени. Система автоматически определяет очаги задымления и передаёт координаты в МЧС. Проект приостановлен на этапе согласования полётных зон, но прототип успешно прошёл испытания на полигоне.',
    tags: ['Python', 'Computer Vision', 'Drones'],
    team: 'AeroGuard',
    participants: 3,
    imageUrl: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=800&q=80',
    projectType: 'city',
  },
  {
    id: 6,
    title: 'EduVR History',
    status: 'Тестирование',
    statusColor: 'bg-purple-600',
    category: 'Образование',
    rating: 5.0,
    votes: 1257,
    desc: 'VR-платформа с виртуальными экскурсиями по исторической Тюмени XIX века: торговые ряды, первые школы, набережная. Ученики надевают очки и «переносятся» на улицы 1890-х, отвечая на интерактивные вопросы. Пилот идёт в 12 школах города, учителя отмечают рост вовлечённости на уроках истории.',
    tags: ['Unity', 'VR', 'EdTech'],
    team: 'TimeTravel',
    participants: 4,
    imageUrl: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=800&q=80',
    projectType: 'commercial',
  },
];

export const SERVICES_LIST: ServiceItem[] = [
  { id: 1, title: "Оплата ЖКХ", category: "ЖКХ", desc: "Передача показаний счетчиков, оплата единой квитанции без комиссии и архив начислений.", imageUrl: imgJkh, buttonText: "Перейти", url: "https://lk.itpc.ru/" },
  { id: 2, title: "Транспортная карта", category: "Транспорт", desc: "Проверка баланса карты ТТС, пополнение счета онлайн и управление льготовными проездными.", imageUrl: imgTts, buttonText: "Открыть ТТС", url: "https://oao-tts.ru/" },
  { id: 3, title: "Моя школа", category: "Образование", desc: "Электронный дневник, расписание уроков, домашние задания и контроль питания ребенка.", imageUrl: imgMySchool, buttonText: "Открыть сервис", url: "https://school.72to.ru/" },
  { id: 4, title: "Запись к врачу", category: "Здоровье", desc: "Онлайн-регистратура поликлиник: запись на прием, вызов врача на дом и доступ к медкарте.", imageUrl: imgHill, buttonText: "Записаться", url: "https://www.gosuslugi.ru/help/faq/doctor/17/" },
  { id: 5, title: "Госуслуги", category: "Госуслуги", desc: "Единый портал государственных услуг для жителей Тюмени и Тюменской области.", imageUrl: imgGosuslygi, buttonText: "Перейти", url: "https://www.gosuslugi.ru/" },
  { id: 6, title: "Тюмень - наш дом", category: "ЖКХ", desc: "Сообщайте о городских проблемах: от ям на дорогах до неработающих фонарей.", imageUrl: imgTymenHous, buttonText: "Сообщить", url: "https://dom.tyumen-city.ru/" },
  { id: 7, title: "Навигатор допобразования", category: "Образование", desc: "Поиск и запись детей в кружки, секции и программы дополнительного образования.", imageUrl: imgDop, buttonText: "Найти программу", url: "https://edo.72to.ru/" },
  { id: 8, title: "Парковки Тюмени", category: "Транспорт", desc: "Информация о городских парковках, тарифах и правилах пользования.", imageUrl: imgParking, buttonText: "Открыть карту", url: "https://tmn-parking.ru/" }
];

export const STUDENT_STORIES: StudentStory[] = [
  { id: 1, name: "Волков Дмитрий Валерьевич", role: "iOS Разработчик", text: "«Я пришел на городской хакатон с идеей, а ушел с инвестором. Мое приложение 'Тюмень Помнит' теперь помогает тысячам жителей находить свободные места в парке»", awards: ["Победитель хакатона 2024", "Грант 500 000 Р на развитие"], imageUrl: "https://i.postimg.cc/VNS0xmLz/105ba0ae5ed326f2f20975ea2095c809-297224.jpg" },
  { id: 2, name: "Соколов Антон Павлович", role: "Data Scientist / ML инженер", text: "«Мы с командой внедрили нейросеть для контроля работы коммунальных служб. Теперь камеры сами определяют проблемные зоны на дорогах, и автоматика отправляет заявки»", awards: ["Резидент Тюменского Технопарка", "Автор патента на ПО"], imageUrl: "https://i.postimg.cc/VNS0xmLz/105ba0ae5ed326f2f20975ea2095c809-297224.jpg" },
  { id: 3, name: "Смирнова Анна Сергеевна", role: "Архитектор-урбанист", text: "«Умный город — это не только код, но и комфортная среда. Я спроектировала 'цифровой сквер' с умными скамейками и эко-датчиками, который администрация уже взяла в работу»", awards: ["Стажировка в Департаменте архитектуры", "Лучший дипломный проект ТИУ"], imageUrl: "https://i.postimg.cc/52Dkd9q3/a22eed23-8a3f-4908-b72a-9bd411f54d1e.png" }
];

export const CAMPUS_TEAMS: CampusTeam[] = [
  { id: 1, title: "EcoMonitors", desc: "Мониторинг воздуха. IoT система сбора и анализа данных о качестве воздуха в городе с визуализацией на интерактивной карте.", members: 3, tags: ["React Native", "Node.js", "InfluxDB"], stack: "Backend Dev, Data Analyst", date: "29 ноября 2025", status: "В разработке" },
  { id: 2, title: "SmartParking", desc: "Городская мобильность. Система поиска свободных парковочных мест в центре города с помощью компьютерного зрения и уличных камер.", members: 5, tags: ["Python", "OpenCV", "Swift"], stack: "ML Engineer, iOS Dev", date: "13 ноября 2025", status: "В разработке" }
];

export const CAMPUS_EVENTS: CampusEvent[] = [
  { id: 1, type: "Конференция", title: "Конференция 'Цифровой город'", date: "15 декабря 2025", time: "10:00 - 18:00", location: "ТИУ, Мельникайте 70", participants: "300+ участников", buttonText: "Зарегистрироваться", bgColor: "bg-[#1e3a4c]" },
  { id: 2, type: "Саммит", title: "Саммит Smart Cities Russia", date: "20 января 2026", time: "09:00 - 17:00", location: "Экспоцентр", participants: "500+ участников", buttonText: "Зарегистрироваться", bgColor: "bg-[#1e3a4c]" },
  { id: 3, type: "Хакатон", title: "Хакатон Smart Transport", date: "10-12 февраля 2026", location: "Технопарк", participants: "150+ участников", buttonText: "Зарегистрироваться", bgColor: "bg-[#1e3a4c]" }
];

export const STUDENT_RESOURCES: Resource[] = [
  { id: 1, name: "Шаблон презентации проекта", format: "PPTX", size: "2.4 MB", icon: "📄" },
  { id: 2, name: "Шаблон технической документации", format: "DOCX", size: "156 KB", icon: "📄" },
  { id: 3, name: "Руководство по Git workflow", format: "PDF", size: "892 KB", icon: "📄" },
  { id: 4, name: "UI/UX Kit Smart City", format: "Figma", size: "Online", icon: "🎨" }
];

export const FOOTER_LINKS = {
  'О проекте': ['Команда', 'Новости', 'Партнеры'],
  'Участникам': ['Как создать проект', 'FAQ', 'Поддержка'],
  'SmartCity': ['Портал "Я решаю"', 'Правительство РФ', 'Правительство Тюменской области', 'Администрация города Тюмень', 'Портал услуг города Тюмень', 'Тюменская городская Дума'],
  'Наши сервисы': ['Портал цифровых сервисов', 'Моя школа', 'Тюмень наш дом', 'Мой терапевт 72', 'Транспорт 72', 'Телемед 72']
};

export const NEWS_CATEGORIES = ["Все", "Технологии", "Город", "События", "Инновации"];

export const NEWS_ARTICLES: NewsArticle[] = [
  { id: 1, imageUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=800", date: "29 ноября 2025", description: "В Тюмени запустили первый беспилотный маршрут в тестовом режиме", tag: "Технологии" },
  { id: 2, imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800", date: "28 ноября 2025", description: "Более 500 студентов приняли участие в городском ИТ-форуме", tag: "События" },
  { id: 3, imageUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=800", date: "27 ноября 2025", description: "Новая система умного освещения сэкономила городу 15% бюджета за месяц", tag: "Инновации" },
  { id: 4, imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800", date: "26 ноября 2025", description: "Тюмень вошла в топ-3 цифровых городов России", tag: "Город" }
];

export const EVENT_CATEGORIES = ["Все", "Конференции и саммиты", "Хакатоны", "Воркшопы"];

export const EVENTS: EventItem[] = [
  { id: 1, title: "Smart City Tyumen 2025", description: "Ежегодная конференция по развитию городской среды", bgColor: "bg-blue-600", textColor: "text-white", colSpan: 2, rowSpan: 2, imageUrl: "https://images.unsplash.com/photo-1540575861501-7ad05823c93b?q=80&w=800" },
  { id: 2, title: "AI & Big Data Summit", description: "Саммит экспертов по данным", bgColor: "bg-[#1e3a4c]", textColor: "text-white" },
  { id: 3, title: "HackTheCity", description: "48-часовой хакатон для разработчиков", bgColor: "bg-yellow-500", textColor: "text-black" },
  { id: 4, title: "Urban Lab", description: "Практический воркшоп по урбанистике", bgColor: "bg-[#1e3a4c]", textColor: "text-white" }
];

export const MANAGEMENT_STEPS: ManagementStep[] = [
  { 
    id: 1, 
    icon: <div className="text-4xl mb-6">💡</div>,
    title: "Инициативы граждан", 
    description: "Предлагайте идеи по улучшению городской среды и голосуйте за проекты других жителей.",
    stat1_val: "1.2K", stat1_desc: "Предложений", stat2_val: "45", stat2_desc: "Реализовано",
    buttonText: "Предложить идею", buttonColor: "bg-yellow-500 text-black hover:bg-yellow-600"
  },
  { 
    id: 2, 
    icon: <div className="text-4xl mb-6">📊</div>,
    title: "Мониторинг", 
    description: "Отслеживайте состояние городских систем в реальном времени через открытые данные.",
    stat1_val: "98%", stat1_desc: "Точность данных", stat2_val: "24/7", stat2_desc: "Режим работы",
    buttonText: "Смотреть карту", buttonColor: "bg-sky-500 text-white hover:bg-sky-600"
  },
  { 
    id: 3, 
    icon: <div className="text-4xl mb-6">🛡️</div>,
    title: "Безопасность", 
    description: "Современные системы видеонаблюдения и аналитики для вашей безопасности.",
    stat1_val: "5K+", stat1_desc: "Умных камер", stat2_val: "-30%", stat2_desc: "Уровень преступности",
    buttonText: "Узнать больше", buttonColor: "bg-blue-700 text-white hover:bg-blue-800"
  }
];

export const PROJECT_CATEGORIES = ["Все", "Транспорт", "Экология", "Безопасность", "ЖКХ", "Здравоохранение", "Образование", "Управление"];

export const RESOURCES: Resource[] = [
  { id: 1, name: "Открытые данные Тюмени", icon: "🌐" },
  { id: 2, name: "Нормативные документы", icon: "📄" },
  { id: 3, name: "ГИС Интеграция", icon: "🗺️" },
  { id: 4, name: "API Сервисы", icon: "🔌" }
];

export const COUNCIL_TASKS = [
  { icon: 'target', title: 'Определение стратегии', subtitle: 'Разработка приоритетных направлений развития' },
  { icon: 'folder', title: 'Управление портфелем', subtitle: 'Координация ключевых городских проектов' },
  { icon: 'ruble', title: 'Бюджетирование', subtitle: 'Распределение средств на инновации' },
  { icon: 'sync', title: 'Взаимодействие', subtitle: 'Связь между бизнесом, властью и наукой' },
  { icon: 'search', title: 'Экспертиза', subtitle: 'Оценка эффективности внедряемых решений' },
  { icon: 'scales', title: 'Нормотворчество', subtitle: 'Подготовка правовой базы для цифры' }
];
export const EVENT_FILTERS = [
  "Все события", "Конференции и саммиты", "Хакатоны",
  "Выставки и демо-дни", "Акселератор", "Стартап-чемпионаты",
  "Цифровые фестивали", "Технические воркшопы", "Гранты и программы",
];

export const EVENT_TAG_COLORS: Record<string, {
  accent: string;
  badge: string;
  filterActive: string;
  filterIdle: string;
}> = {
  "Конференции и саммиты": {
    accent: "border-t-sky-400",
    badge: "text-sky-300 bg-sky-500/20 border-sky-400/30",
    filterActive: "bg-sky-400 text-black font-bold",
    filterIdle: "bg-sky-500/15 text-sky-200 hover:bg-sky-500/25 border border-sky-400/20",
  },
  "Хакатоны": {
    accent: "border-t-yellow-400",
    badge: "text-yellow-300 bg-yellow-500/20 border-yellow-400/30",
    filterActive: "bg-yellow-400 text-black font-bold",
    filterIdle: "bg-yellow-500/15 text-yellow-200 hover:bg-yellow-500/25 border border-yellow-400/20",
  },
  "Выставки и демо-дни": {
    accent: "border-t-purple-400",
    badge: "text-purple-300 bg-purple-500/20 border-purple-400/30",
    filterActive: "bg-purple-400 text-black font-bold",
    filterIdle: "bg-purple-500/15 text-purple-200 hover:bg-purple-500/25 border border-purple-400/20",
  },
  "Акселератор": {
    accent: "border-t-green-400",
    badge: "text-green-300 bg-green-500/20 border-green-400/30",
    filterActive: "bg-green-400 text-black font-bold",
    filterIdle: "bg-green-500/15 text-green-200 hover:bg-green-500/25 border border-green-400/20",
  },
  "Стартап-чемпионаты": {
    accent: "border-t-red-400",
    badge: "text-red-300 bg-red-500/20 border-red-400/30",
    filterActive: "bg-red-400 text-black font-bold",
    filterIdle: "bg-red-500/15 text-red-200 hover:bg-red-500/25 border border-red-400/20",
  },
  "Цифровые фестивали": {
    accent: "border-t-pink-400",
    badge: "text-pink-300 bg-pink-500/20 border-pink-400/30",
    filterActive: "bg-pink-400 text-black font-bold",
    filterIdle: "bg-pink-500/15 text-pink-200 hover:bg-pink-500/25 border border-pink-400/20",
  },
  "Технические воркшопы": {
    accent: "border-t-orange-400",
    badge: "text-orange-300 bg-orange-500/20 border-orange-400/30",
    filterActive: "bg-orange-400 text-black font-bold",
    filterIdle: "bg-orange-500/15 text-orange-200 hover:bg-orange-500/25 border border-orange-400/20",
  },
  "Гранты и программы": {
    accent: "border-t-emerald-400",
    badge: "text-emerald-300 bg-emerald-500/20 border-emerald-400/30",
    filterActive: "bg-emerald-400 text-black font-bold",
    filterIdle: "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 border border-emerald-400/20",
  },
};

export const DEFAULT_EVENT_TAG_COLOR = {
  accent: "border-t-gray-400",
  badge: "text-gray-300 bg-gray-500/20 border-gray-400/30",
  filterActive: "bg-gray-300 text-black font-bold",
  filterIdle: "bg-[#64748b]/30 text-gray-300 hover:bg-[#64748b]/50",
};
export const COUNCIL_MEMBERS: Member[] = [
  { 
    id: 1, 
    name: "Громов Владимир Сергеевич", 
    role: "Зам.главы по цифровизации", 
    imageUrl: "https://avatars.mds.yandex.net/i?id=d8e95fc94c4364858a23a4c7d7c74b293306e6ad-5219934-images-thumbs&n=13" 
  },
  { 
    id: 2, 
    name: "Соколова Елена Павловна", 
    role: "Руководитель отдела по IT", 
    imageUrl: "https://avatars.mds.yandex.net/i?id=d8e95fc94c4364858a23a4c7d7c74b293306e6ad-5219934-images-thumbs&n=13" 
  },
  { 
    id: 3, 
    name: "Кравцов Дмитрий Игоревич", 
    role: "Глава ключевого департамента", 
    imageUrl: "https://avatars.mds.yandex.net/i?id=d8e95fc94c4364858a23a4c7d7c74b293306e6ad-5219934-images-thumbs&n=13" 
  },
  { 
    id: 4, 
    name: "Вербицкая Ольга Николаевна", 
    role: "Представитель образования и науки", 
    imageUrl: "https://avatars.mds.yandex.net/i?id=d8e95fc94c4364858a23a4c7d7c74b293306e6ad-5219934-images-thumbs&n=13" 
  },
  { 
    id: 5, 
    name: "Морозов Сергей Александрович", 
    role: "Представительство партнеров от бизнеса", 
    imageUrl: "https://avatars.mds.yandex.net/i?id=d8e95fc94c4364858a23a4c7d7c74b293306e6ad-5219934-images-thumbs&n=13" 
  },
  { 
    id: 6, 
    name: "Журавлева Мария Алексеевна", 
    role: "Общественник", 
    imageUrl: "https://avatars.mds.yandex.net/i?id=d8e95fc94c4364858a23a4c7d7c74b293306e6ad-5219934-images-thumbs&n=13" 
  }
];
export const DETAILED_EVENTS = [
  {
    id: 1,
    tag: "Конференция",
    title: "Конференция “Цифровой город”",
    date: "15 декабря 2025",
    time: "16:00 - 18:00",
    location: "ТИУ, Мельникайте 70",
    participants: "300+ участников",
    accentColor: "border-sky-400"
  },
  {
    id: 2,
    tag: "Саммит",
    title: "Саммит Smart Cities Russia",
    date: "20 января 2026",
    time: "09:00 - 19:00",
    location: "Экспоцентр",
    participants: "500+ участников",
    accentColor: "border-cyan-500"
  },
  {
    id: 3,
    tag: "Конференция",
    title: "IoT Conference 2026",
    date: "10 февраля 2026",
    time: "11:00 - 17:00",
    location: "Онлайн",
    participants: "1000+ участников",
    accentColor: "border-blue-500"
  },
  {
    id: 4,
    tag: "Хакатон",
    title: "Хакатон Smart Transport",
    date: "20-22 декабря 2025",
    time: "10:00 - 18:00",
    location: "Технопарк",
    participants: "150+ участников",
    accentColor: "border-yellow-400"
  },
  {
    id: 5,
    tag: "Демо-день",
    title: "Demo Day для инвесторов",
    date: "20 февраля 2026",
    time: "15:00 - 19:00",
    location: "Бизнес-центр “Заполярье”",
    participants: "50 star-up проектов",
    accentColor: "border-green-400"
  },
  {
    id: 6,
    tag: "Акселератор",
    title: "IoT Accelerator Program",
    date: "1 февраля - 1 мая 2026",
    time: "3 месяца",
    location: "Технопарк",
    participants: "15 команд",
    accentColor: "border-red-400"
  },
  {
    id: 7,
    tag: "Воркшоп",
    title: "Machine Learning Workshop",
    date: "18 января 2026",
    time: "14:00 - 18:00",
    location: "Компьютерный класс",
    participants: "25 мест",
    accentColor: "border-emerald-500"
  },
  {
    id: 8,
    tag: "Фестиваль",
    title: "Tech & Art Festival",
    date: "20-22 марта 2026",
    time: "3 дня",
    location: "Арт-пространство",
    participants: "3000+ посетителей",
    accentColor: "border-fuchsia-500"
  },
  {
    id: 9,
    tag: "Чемпионат",
    title: "Regional Tech Championship",
    date: "10 апреля 2026",
    time: "09:00 - 19:00",
    location: "Региональный центр",
    participants: "60 команд",
    accentColor: "border-orange-500"
  }
];
export const COMMITTEE_MEMBERS: Member[] = [
  { id: 1, name: "Сидоров Сидор", role: "Технический директор", imageUrl: "https://i.postimg.cc/VNS0xmLz/105ba0ae5ed326f2f20975ea2095c809-297224.jpg" },
  { id: 2, name: "Козлова Анна", role: "Ведущий аналитик", imageUrl: "https://i.postimg.cc/VNS0xmLz/105ba0ae5ed326f2f20975ea2095c809-297224.jpg" }
];

export const MONITORING_MEMBERS: Member[] = [
  { id: 1, name: "Смирнов Олег", role: "Руководитель группы", imageUrl: "https://i.postimg.cc/VNS0xmLz/105ba0ae5ed326f2f20975ea2095c809-297224.jpg" }
];

export const USER_PROFILE = {
  name: "Александр Иванов",
  level: 5,
  points: 1250,
  joinedTeams: [1, 2]
};