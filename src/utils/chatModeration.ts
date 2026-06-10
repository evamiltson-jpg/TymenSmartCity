export type ChatModerationMode = 'city' | 'project';

export interface ModerationResult {
  blocked: boolean;
  reply?: string;
}

const PROFANITY_RE =
  /(?:^|[^\p{L}])(?:хуй|хуя|хуе|хуё|пизд|еба[тл]|ёба[тл]|бля[тдь]?|сука|мудил|пидор|пидр|гандон)(?:[^\p{L}]|$)|(?:^|[^\p{L}])жоп[аеу](?:[^\p{L}]|$)/iu;

const VIOLENCE_RE =
  /вилкой|в\s+глаз|убить|убей|зарезать|изнасил|расстрел|пытк|насили/i;

const HARASSMENT_RE =
  /вилкой|в\s+глаз|в\s+жоп|или\s+в\s+(?:глаз|жоп)|что\s+лучше.*(?:убить|больно)/i;

const PROJECT_TOPIC_RE =
  /проект|назван|описан|команд|таймлайн|конкурс|mvp|технолог|функци|задач|питч|стартап|иде[яи]|разработ|досуг|приложен|план|этап|шанс|мероприят|хакатон|защит|проблем|результат|аудитор|пользовател|фич|функционал/i;

const OFF_TOPIC_RE =
  /сколько\s+(?:км|километр|метр|миль)|до\s+лун|столиц[ае]\s|погод[ае]|рецепт|кто\s+(?:такой|такая|победил)|когда\s+(?:умер|родился)|сколько\s+будет\s+\d|2\s*\+\s*2|столица\s+\w+/i;

const BLOCKED_REPLY =
  'Такие сообщения здесь не принимаются. Пожалуйста, задайте вопрос по делу.';

const PROJECT_OFF_TOPIC_REPLY =
  'Я отвечаю только на вопросы по вашему студенческому проекту — идея, план, команда, технологии, конкурсы. Спросите что-то из этого.';

const CITY_OFF_TOPIC_REPLY =
  'Я помогаю найти разделы, сервисы и проекты на этом сайте. Напишите, что ищете.';

export function moderateUserMessage(
  text: string,
  mode: ChatModerationMode,
): ModerationResult {
  const trimmed = text.trim();
  if (!trimmed) return { blocked: true, reply: 'Пустое сообщение.' };

  if (PROFANITY_RE.test(trimmed) || VIOLENCE_RE.test(trimmed) || HARASSMENT_RE.test(trimmed)) {
    return { blocked: true, reply: BLOCKED_REPLY };
  }

  if (mode === 'project' && !PROJECT_TOPIC_RE.test(trimmed) && OFF_TOPIC_RE.test(trimmed)) {
    return { blocked: true, reply: PROJECT_OFF_TOPIC_REPLY };
  }

  if (mode === 'city' && OFF_TOPIC_RE.test(trimmed) && !/сервис|раздел|проект|ттс|врач|жкх|запис|найти|где/i.test(trimmed)) {
    return { blocked: true, reply: CITY_OFF_TOPIC_REPLY };
  }

  return { blocked: false };
}
