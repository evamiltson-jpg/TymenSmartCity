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
  title?: string;
  description?: string;
  stage?: string;
  technologies?: string[];
}

interface RequestBody {
  mode: ChatMode;
  message: string;
  history?: HistoryMessage[];
  cityContext?: string;
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
  maxTokensProject: 700,
  maxTokensComplaint: 200,
} as const;

const trimHistory = (history: HistoryMessage[] = []): HistoryMessage[] =>
  history.slice(-LIMITS.maxHistory);

const buildCitySystemPrompt = (cityContext: string) =>
  `Ты — ИИ-консультант портала "Умный город Тюмень".

ТВОЯ БАЗА ЗНАНИЙ:
${cityContext}

СТРОГИЕ ПРАВИЛА:
1. ССЫЛКИ: используй формат [[тип:ID|Название]]. Пример: [[сервис:5|Городской Wi-Fi]] или [[проект:UUID|Умный светофор]].
2. РЕЛЕВАНТНОСТЬ:
   - ЖКХ, больницы, школы, транспорт → ТОЛЬКО СЕРВИСЫ.
   - "хочу команду", "я программист", "есть идея" → ПРОЕКТЫ.
3. ТОЧНОСТЬ: ID и названия СТРОГО из базы. Не выдумывай.
4. ЖАЛОБЫ: если пользователь описывает ошибку сайта/баг — кратко уточни детали и предложи нажать «Сообщить об ошибке» в чате.
5. ГРАНИЦЫ: ты консультант портала, не универсальный ChatGPT. Отказывайся от тем вне города, сервисов, проектов и команд.
6. СТИЛЬ: кратко, по делу, на русском.`;

const buildProjectSystemPrompt = (ctx: ProjectContext) => {
  const brief = [
    ctx.title ? `Название (черновик): ${ctx.title}` : null,
    ctx.stage ? `Стадия: ${ctx.stage}` : null,
    ctx.description ? `Описание: ${ctx.description}` : null,
    ctx.technologies?.length
      ? `Технологии: ${ctx.technologies.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Ты — проектный ИИ-консультант для студентов портала "Умный город Тюмень".

КОНТЕКСТ ПРОЕКТА ПОЛЬЗОВАТЕЛЯ:
${brief || "Проект ещё не описан — помоги начать с идеи."}

ТВОЯ РОЛЬ — КОНСУЛЬТАНТ, НЕ ИСПОЛНИТЕЛЬ:
- Помогаешь сформулировать название, описание, функции, задачи, состав команды.
- Предлагаешь таймлайн этапов (формат: «Неделя N — событие»).
- Рекомендуешь конференции/конкурсы/хакатоны в РФ (реалистичные, без выдуманных дат).
- Оцениваешь шансы на победу (низкие/средние/высокие) и даёшь 2–3 совета по доработке.
- Напоминаешь: проект делает команда, ты только советуешь.

СТРОГИЕ ГРАНИЦЫ:
- Только темы студенческих ИТ/инновационных проектов. Отказывайся от посторонних тем.
- Не пиши готовый код, ТЗ на 10 страниц и не делай работу за студента.
- Ответы компактные: до 250 слов, структурируй списками.
- Если данных мало — задай 1 уточняющий вопрос, не фантазируй.
- Ссылки на проекты портала: [[проект:UUID|Название]] только если уверен в ID.`;
};

const callDeepSeek = async (
  systemPrompt: string,
  message: string,
  history: HistoryMessage[],
  maxTokens: number,
): Promise<string> => {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY не настроен на сервере");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("DeepSeek error:", response.status, errText);
    throw new Error("Ошибка AI-сервиса");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "Не удалось получить ответ.";
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
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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

    const history = trimHistory(body.history);

    let systemPrompt: string;
    let maxTokens: number;

    if (mode === "project") {
      systemPrompt = buildProjectSystemPrompt(body.projectContext ?? {});
      maxTokens = LIMITS.maxTokensProject;
    } else {
      systemPrompt = buildCitySystemPrompt(body.cityContext ?? "Данные не загружены.");
      maxTokens = LIMITS.maxTokensCity;
    }

    const reply = await callDeepSeek(systemPrompt, message, history, maxTokens);

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
