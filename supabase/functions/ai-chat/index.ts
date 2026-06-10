import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ChatMode = "city" | "project" | "complaint";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProjectContext {
  projectId?: string;
  title?: string;
  description?: string;
  problem?: string;
  expectedResult?: string;
  stage?: string;
  status?: string;
  direction?: string;
  technologies?: string[];
  neededRoles?: string[];
  teamName?: string;
  lookingForTeam?: boolean;
}

interface RequestBody {
  mode: ChatMode;
  message: string;
  history?: HistoryMessage[];
  cityContext?: string;
  eventsContext?: string;
  projectContext?: ProjectContext;
  complaint?: {
    description: string;
    page?: string;
    userEmail?: string;
  };
}

const LIMITS = {
  maxInputLength: 600,
  maxHistory: 8,
  maxTokensCity: 450,
  maxTokensProject: 450,
} as const;

/** HTTP-коды, при которых пробуем следующий провайдер */
const FALLBACK_STATUSES = new Set([401, 402, 403, 429, 500, 502, 503, 529]);

type ProviderId = "groq" | "gemini" | "deepseek";

interface AiProvider {
  id: ProviderId;
  label: string;
  getKey: () => string | undefined;
  url: string;
  model: string;
}

const PROVIDER_DEFS: AiProvider[] = [
  {
    id: "groq",
    label: "Groq",
    getKey: () => Deno.env.get("GROQ_API_KEY"),
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  },
  {
    id: "gemini",
    label: "Gemini",
    getKey: () =>
      Deno.env.get("GEMINI_API_KEY") ??
      Deno.env.get("GOOGLE_API_KEY") ??
      undefined,
    url:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.0-flash",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    getKey: () => Deno.env.get("DEEPSEEK_API_KEY"),
    url: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
  },
];

const trimHistory = (history: HistoryMessage[] = []): HistoryMessage[] =>
  history.slice(-LIMITS.maxHistory);

const PROFANITY_RE =
  /(?:^|[^\p{L}])(?:хуй|хуя|хуе|хуё|пизд|еба[тл]|ёба[тл]|бля[тдь]?|сука|мудил|пидор|пидр|гандон)(?:[^\p{L}]|$)|(?:^|[^\p{L}])жоп[аеу](?:[^\p{L}]|$)/iu;

const VIOLENCE_RE =
  /вилкой|в\s+глаз|в\s+жоп|убить|убей|зарезать|изнасил|расстрел|пытк|насили/i;

const HARASSMENT_RE =
  /вилкой|в\s+глаз|в\s+жоп|или\s+в\s+(?:глаз|жоп)/i;

const PROJECT_TOPIC_RE =
  /проект|назван|описан|команд|таймлайн|конкурс|mvp|технолог|функци|задач|питч|стартап|иде[яи]|разработ|досуг|приложен|план|этап|шанс|мероприят|хакатон|защит|проблем|результат|аудитор|пользовател|фич|функционал/i;

const OFF_TOPIC_RE =
  /сколько\s+(?:км|километр|метр|миль)|до\s+лун|столиц[ае]\s|погод[ае]|рецепт|кто\s+(?:такой|такая|победил)|когда\s+(?:умер|родился)|сколько\s+будет\s+\d|2\s*\+\s*2/i;

const moderateMessage = (text: string, mode: ChatMode): string | null => {
  const trimmed = text.trim();
  if (!trimmed) return "Пустое сообщение.";

  if (PROFANITY_RE.test(trimmed) || VIOLENCE_RE.test(trimmed) || HARASSMENT_RE.test(trimmed)) {
    return "Такие сообщения здесь не принимаются. Пожалуйста, задайте вопрос по делу.";
  }

  if (mode === "project" && !PROJECT_TOPIC_RE.test(trimmed) && OFF_TOPIC_RE.test(trimmed)) {
    return "Я отвечаю только на вопросы по вашему студенческому проекту — идея, план, команда, технологии, конкурсы. Спросите что-то из этого.";
  }

  if (
    mode === "city" &&
    OFF_TOPIC_RE.test(trimmed) &&
    !/сервис|раздел|проект|ттс|врач|жкх|запис|найти|где/i.test(trimmed)
  ) {
    return "Я помогаю найти разделы, сервисы и проекты на этом сайте. Напишите, что ищете.";
  }

  return null;
};

const getProviderOrder = (): ProviderId[] => {
  const raw = Deno.env.get("AI_PROVIDER_ORDER") ?? "groq,gemini,deepseek";
  const parsed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderId =>
      s === "groq" || s === "gemini" || s === "deepseek"
    );
  return parsed.length ? parsed : ["groq", "gemini", "deepseek"];
};

const getActiveProviders = (): AiProvider[] => {
  const order = getProviderOrder();
  const byId = new Map(PROVIDER_DEFS.map((p) => [p.id, p]));

  return order
    .map((id) => byId.get(id))
    .filter((p): p is AiProvider => Boolean(p?.getKey()));
};

const buildCitySystemPrompt = (cityContext: string) =>
  `Ты — навигатор по сайту "Умный город Тюмень". Помогаешь найти раздел, сервис или проект НА ЭТОМ САЙТЕ.

БАЗА:
${cityContext}

ПРАВИЛА:
1. ССЫЛКИ (обязательно кликабельные):
   - Сервис: [[сервис:ID|Название]] — например [[сервис:2|Транспортная карта]] для ТТС
   - Проект: [[проект:ID|Название]]
   - Раздел сайта: [[раздел:services|Цифровые сервисы]], [[раздел:projects|Проекты]], [[раздел:campus|Студентам]]
2. КОРОТКО: 2–4 предложения максимум. Сначала ответ, потом ссылка. Без эмодзи.
3. ТОЧНОСТЬ: ID только из базы. Не выдумывай.
4. Транспорт/ТТС → [[сервис:2|Транспортная карта]] или [[раздел:services|Сервисы]]
5. Врач/поликлиника → [[сервис:4|Запись к врачу]]
6. ЖКХ → [[сервис:1|Оплата ЖКХ]]
7. ИТ-проект/команда → [[раздел:projects|Проекты]] + при необходимости [[проект:ID|Название]]
8. Вне сайта — вежливо откажи. Ты навигатор портала, не ChatGPT.
9. Ошибка сайта → предложи кнопку «Сообщить об ошибке».`;

const buildProjectSystemPrompt = (ctx: ProjectContext, eventsContext: string) => {
  const brief = [
    ctx.projectId ? `ID проекта на портале: ${ctx.projectId}` : null,
    ctx.title ? `Название: ${ctx.title}` : null,
    ctx.stage ? `Стадия: ${ctx.stage}` : null,
    ctx.status ? `Статус в системе: ${ctx.status}` : null,
    ctx.direction ? `Направление: ${ctx.direction}` : null,
    ctx.problem ? `Проблема: ${ctx.problem}` : null,
    ctx.description ? `Описание: ${ctx.description}` : null,
    ctx.expectedResult ? `Ожидаемый результат: ${ctx.expectedResult}` : null,
    ctx.technologies?.length
      ? `Технологии: ${ctx.technologies.join(", ")}`
      : null,
    ctx.neededRoles?.length
      ? `Нужные роли: ${ctx.neededRoles.join(", ")}`
      : null,
    ctx.teamName ? `Команда: ${ctx.teamName}` : null,
    ctx.lookingForTeam ? "Ищет участников в команду: да" : null,
  ]
    .filter(Boolean)
    .join("\n");

  const eventsBlock = eventsContext
    ? `\n\nКОНКУРСЫ И МЕРОПРИЯТИЯ (только из списка, ссылка [[событие:ID|Название]]):\n${eventsContext}`
    : "";

  return `Ты — Проша, помощник по студенческим проектам портала "Умный город Тюмень".

КОНТЕКСТ ПРОЕКТА:
${brief || "Проект ещё не описан — помоги начать с идеи."}${eventsBlock}

СТИЛЬ: простой разговорный русский, как объясняешь одногруппнику. Короткие фразы, без канцелярита. Без эмодзи.

ФОРМАТ ОТВЕТА:
- Перечисления (роли, функции, технологии, задачи) — маркированный списком, каждый пункт с новой строки: «* пункт»
- Обычный текст — короткими абзацами

ТОЛЬКО ПО ВОПРОСУ:
- Отвечай строго на последнее сообщение.
- Не добавляй таймлайн, конкурсы, команду, если об этом не спросили.
- Вопрос не по проекту (факты, шутки, провокации) — НЕ отвечай на него. Одна фраза: «Это не про проект — спросите про идею, план, команду или конкурсы».

ТЕХНОЛОГИИ (если спросили):
- Подбирай под задачу: веб/приложение → React, TypeScript; анализ данных/настроения → Python.
- Не тащи C++, Blockchain и прочее из описания, если это не подходит по смыслу.
- Список в тексте (* технология — зачем). Для записи в карточку: {{предложение|technologies|React, TypeScript, Python}}.

ТАЙМЛАЙН (только если просят): «Неделя N — задача», 6–8 недель.

КОНКУРСЫ (только если просят): из базы, ссылка [[событие:ID|Название]].

ЗАПИСЬ В ПРОЕКТ (карточка «Принять» в чате):
Если помогаешь сформулировать название, описание, проблему, результат, статус или стек — в конце ОДНА строка:
{{предложение|поле|готовый текст}}
поле: title, description, problem, expected_result, status, technologies
technologies — через запятую: React, TypeScript, Python
Пример: {{предложение|title|Досуг по настроению}}
Для ролей команды — только список в тексте, без {{предложение}}.

До 150 слов. Без кода.`;
};

const parseApiError = (status: number, errText: string, label: string): string => {
  let detail = "";
  try {
    const parsed = JSON.parse(errText);
    detail = parsed?.error?.message || parsed?.message || "";
  } catch {
    detail = errText.slice(0, 160);
  }

  if (status === 401 || status === 403) {
    return `${label}: неверный или просроченный ключ`;
  }
  if (status === 402) {
    return `${label}: закончился бесплатный лимит / баланс`;
  }
  if (status === 429) {
    return `${label}: превышен лимит запросов (rate limit)`;
  }
  return detail ? `${label}: ${detail}` : `${label}: ошибка ${status}`;
};

const callOpenAiCompatible = async (
  provider: AiProvider,
  systemPrompt: string,
  message: string,
  history: HistoryMessage[],
  maxTokens: number,
): Promise<string> => {
  const apiKey = provider.getKey();
  if (!apiKey) {
    throw new Error(`${provider.label}: ключ не задан`);
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`${provider.label} error:`, response.status, errText);
    const err = new Error(parseApiError(response.status, errText, provider.label));
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`${provider.label}: пустой ответ`);
  }
  return text;
};

const callWithFallback = async (
  systemPrompt: string,
  message: string,
  history: HistoryMessage[],
  maxTokens: number,
): Promise<string> => {
  const providers = getActiveProviders();

  if (!providers.length) {
    throw new Error(
      "Нет настроенных AI-ключей. Задайте GROQ_API_KEY и/или GEMINI_API_KEY в Supabase Secrets.",
    );
  }

  const errors: string[] = [];

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    try {
      const reply = await callOpenAiCompatible(
        provider,
        systemPrompt,
        message,
        history,
        maxTokens,
      );
      if (i > 0) {
        console.info(`AI fallback: used ${provider.label} after ${i} failed attempt(s)`);
      }
      return reply;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as Error & { status?: number }).status;
      errors.push(msg);
      console.warn(`${provider.label} failed:`, msg);

      const hasNext = i < providers.length - 1;
      const shouldFallback = status ? FALLBACK_STATUSES.has(status) : true;

      if (hasNext && shouldFallback) {
        continue;
      }
      break;
    }
  }

  throw new Error(
    `Все AI-провайдеры недоступны:\n${errors.map((e) => `• ${e}`).join("\n")}`,
  );
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const mode = body.mode ?? "city";
    const message = (body.message ?? "").trim().slice(0, LIMITS.maxInputLength);

    if (!message && mode !== "complaint") {
      return new Response(
        JSON.stringify({ error: "Пустое сообщение" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode === "complaint") {
      const description = (body.complaint?.description ?? message).trim();
      if (!description) {
        return new Response(
          JSON.stringify({ error: "Опишите проблему" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const authHeader = req.headers.get("Authorization");
      let userId: string | null = null;
      if (authHeader) {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
            Deno.env.get("SUPABASE_ANON_KEY") ??
            "",
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id ?? null;
      }

      const { error } = await supabase.from("user_feedback").insert({
        user_id: userId,
        description: description.slice(0, 2000),
        page: body.complaint?.page?.slice(0, 200) ?? null,
        contact_email: body.complaint?.userEmail?.slice(0, 255) ?? null,
        source: "ai_chat",
      });

      if (error) {
        console.error("Feedback insert error:", error);
        throw new Error("Не удалось сохранить жалобу");
      }

      return new Response(
        JSON.stringify({
          reply:
            "Спасибо! Жалоба зарегистрирована. Команда портала рассмотрит её в ближайшее время.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const blockedReply = moderateMessage(message, mode);
    if (blockedReply) {
      return new Response(
        JSON.stringify({ reply: blockedReply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const history = trimHistory(body.history);

    let systemPrompt: string;
    let maxTokens: number;

    if (mode === "project") {
      systemPrompt = buildProjectSystemPrompt(
        body.projectContext ?? {},
        body.eventsContext ?? "",
      );
      maxTokens = LIMITS.maxTokensProject;
    } else {
      systemPrompt = buildCitySystemPrompt(body.cityContext ?? "Данные не загружены.");
      maxTokens = LIMITS.maxTokensCity;
    }

    const reply = await callWithFallback(systemPrompt, message, history, maxTokens);

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Внутренняя ошибка";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
