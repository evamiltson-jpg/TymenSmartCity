import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AiHistoryMessage,
  MAX_SESSION_MESSAGES,
  PROJECT_QUICK_PROMPTS,
  ProjectBrief,
  projectBriefToContext,
  sendAiMessage,
} from '../../services/aiService';
import { parseAiLinks } from '../../utils/parseAiLinks';
import { supabase } from '../../services/supabase';
import { InfoModal } from '../InfoModal';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

const STORAGE_KEY = 'project_assistant_brief_v1';

const STAGE_OPTIONS: { value: ProjectBrief['stage']; label: string }[] = [
  { value: 'idea', label: '💡 Идея' },
  { value: 'development', label: '🔧 В разработке' },
  { value: 'mvp', label: '🚀 MVP' },
  { value: 'pitch', label: '🎯 Питч' },
];

const defaultBrief: ProjectBrief = {
  title: '',
  description: '',
  stage: 'idea',
  technologies: [],
};

function loadBrief(): ProjectBrief {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultBrief, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...defaultBrief };
}

function extractTimelineItems(text: string): { week: string; title: string }[] {
  const lines = text.split('\n');
  const items: { week: string; title: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^(?:[-•*]|\d+\.)\s*(?:недел[яи]\s*)?(\d+|[\d.]+)\s*[-–—:]\s*(.+)$/i);
    if (m) items.push({ week: m[1], title: m[2].trim() });
  }
  return items.slice(0, 6);
}

export const ProjectAssistant: React.FC = () => {
  const [brief, setBrief] = useState<ProjectBrief>(loadBrief);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: 'Привет! Я проектный консультант — помогу с названием, описанием, задачами, командой, таймлайном и конкурсами. Заполни кратко идею слева или выбери быстрый вопрос. Я советую, а проект делаете вы 💪',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [techInput, setTechInput] = useState('');
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [timelinePreview, setTimelinePreview] = useState<{ week: string; title: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brief));
  }, [brief]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const buildApiHistory = useCallback((): AiHistoryMessage[] => {
    return messages
      .slice(-8)
      .map((m) => ({
        role: (m.role === 'ai' ? 'assistant' : 'user') as AiHistoryMessage['role'],
        content: m.text,
      }));
  }, [messages]);

  const handleLinkClick = async ({ type, id, label }: { type: string; id: string; label: string }) => {
    const table = type === 'проект' ? 'projects' : type === 'команда' ? 'teams' : 'services';
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();

    if (error || !data) {
      alert('Карточка не найдена в базе.');
      return;
    }

    setSelectedItem({
      title: data.title ?? data.name ?? label,
      desc: data.description ?? data.desc ?? '',
      category: data.category ?? data.direction,
      image: data.image_url,
      isService: type === 'сервис',
      buttonText: type === 'проект' ? 'Подать заявку' : data.button_text || 'Перейти',
      status: type === 'проект' ? data.status : undefined,
    });
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (sessionCount >= MAX_SESSION_MESSAGES) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Лимит сессии исчерпан (20 сообщений). Нажмите «Новая сессия», чтобы продолжить.' },
      ]);
      return;
    }

    setInput('');
    const priorHistory = buildApiHistory();
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);
    setSessionCount((c) => c + 1);

    try {
      const reply = await sendAiMessage({
        mode: 'project',
        message: trimmed,
        history: priorHistory,
        projectContext: projectBriefToContext(brief),
      });

      setMessages((prev) => [...prev, { role: 'ai', text: reply }]);

      if (/таймлайн|недел|этап/i.test(trimmed) || /недел/i.test(reply)) {
        const items = extractTimelineItems(reply);
        if (items.length) setTimelinePreview(items);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Не удалось связаться с консультантом. Убедитесь, что Edge Function ai-chat развёрнута и ключ DEEPSEEK_API_KEY задан в Supabase.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setSessionCount(0);
    setMessages([
      {
        role: 'ai',
        text: 'Новая сессия! Опишите идею или выберите быстрый вопрос — я помогу в рамках вашего проекта.',
      },
    ]);
    setTimelinePreview([]);
  };

  const addTech = () => {
    const t = techInput.trim();
    if (!t || brief.technologies.includes(t)) return;
    setBrief((b) => ({ ...b, technologies: [...b.technologies, t].slice(0, 8) }));
    setTechInput('');
  };

  const sessionProgress = Math.min(100, (sessionCount / MAX_SESSION_MESSAGES) * 100);

  return (
    <>
      <section className="relative mb-20 mt-20 overflow-hidden rounded-[50px] border border-white/5 bg-[#0b2234]">
        {/* Animated background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="assistant-orb assistant-orb-1" />
          <div className="assistant-orb assistant-orb-2" />
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-sky-500/5" />
        </div>

        <div className="relative p-8 md:p-14">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
              Проектный ИИ-консультант
            </div>
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">От идеи до питча</h2>
            <p className="mx-auto max-w-2xl text-sm text-gray-400">
              Мини-консультант по вашему проекту: название, задачи, команда, таймлайн и конкурсы.
              ИИ помогает думать — реализуете вы.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left: project brief + timeline */}
            <div className="space-y-6 lg:col-span-4">
              <div className="rounded-[28px] border border-white/10 bg-[#122e41]/80 p-6 backdrop-blur-md">
                <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-yellow-400">
                  Ваш проект
                </h3>
                <input
                  value={brief.title}
                  onChange={(e) => setBrief((b) => ({ ...b, title: e.target.value }))}
                  placeholder="Рабочее название..."
                  className="mb-3 w-full rounded-xl border border-white/10 bg-[#0b2234] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400/50"
                />
                <textarea
                  value={brief.description}
                  onChange={(e) => setBrief((b) => ({ ...b, description: e.target.value }))}
                  placeholder="Кратко: какую проблему решаете?"
                  rows={4}
                  className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-[#0b2234] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400/50"
                />
                <div className="mb-4 flex flex-wrap gap-2">
                  {STAGE_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setBrief((b) => ({ ...b, stage: s.value }))}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                        brief.stage === s.value
                          ? 'bg-yellow-400 text-black'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTech()}
                    placeholder="React, Python..."
                    className="flex-grow rounded-xl border border-white/10 bg-[#0b2234] px-3 py-2 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={addTech}
                    className="rounded-xl bg-white/10 px-3 text-xs font-bold hover:bg-white/20"
                  >
                    +
                  </button>
                </div>
                {brief.technologies.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {brief.technologies.map((t) => (
                      <span
                        key={t}
                        className="rounded-lg bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Mini timeline */}
              <div className="rounded-[28px] border border-white/10 bg-[#122e41]/60 p-6 backdrop-blur-md">
                <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/70">
                  <span className="text-base">📅</span> Таймлайн проекта
                </h3>
                {timelinePreview.length > 0 ? (
                  <div className="relative ml-3 space-y-4 border-l-2 border-yellow-400/30 pl-6">
                    {timelinePreview.map((item, i) => (
                      <div
                        key={i}
                        className="assistant-timeline-item relative animate-in fade-in slide-in-from-left-2 duration-500"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-[#122e41] bg-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400/80">
                          Нед. {item.week}
                        </span>
                        <p className="text-sm font-medium text-white/90">{item.title}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Нажмите «Таймлайн» в быстрых вопросах — здесь появятся этапы.
                  </p>
                )}
              </div>

              {/* Session meter */}
              <div className="rounded-2xl border border-white/5 bg-[#0b2234]/60 p-4">
                <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <span>Сессия</span>
                  <span>
                    {sessionCount}/{MAX_SESSION_MESSAGES}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                    style={{ width: `${sessionProgress}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={resetSession}
                  className="mt-3 w-full rounded-xl border border-white/10 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:border-yellow-400/30 hover:text-yellow-400"
                >
                  Новая сессия
                </button>
              </div>
            </div>

            {/* Right: chat */}
            <div className="flex flex-col lg:col-span-8">
              <div className="mb-4 flex flex-wrap gap-2">
                {PROJECT_QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    disabled={loading || sessionCount >= MAX_SESSION_MESSAGES}
                    onClick={() => sendMessage(q.prompt)}
                    className="group flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#122e41]/80 px-3 py-2 text-[11px] font-bold text-gray-300 transition-all hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300 disabled:opacity-40"
                  >
                    <span className="transition-transform group-hover:scale-110">{q.icon}</span>
                    {q.label}
                  </button>
                ))}
              </div>

              <div className="flex min-h-[420px] flex-grow flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0f2536]/90 backdrop-blur-md">
                <div ref={scrollRef} className="custom-scrollbar flex-grow space-y-4 overflow-y-auto p-5">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                        m.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[92%] whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed shadow-md ${
                          m.role === 'user'
                            ? 'bg-yellow-500 font-medium text-black'
                            : 'bg-[#1a3a4d] text-white'
                        }`}
                      >
                        {m.role === 'ai'
                          ? parseAiLinks(m.text, { onLinkClick: handleLinkClick })
                          : m.text}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-white/40">
                      <span className="assistant-typing-dot" />
                      <span className="assistant-typing-dot animation-delay-200" />
                      <span className="assistant-typing-dot animation-delay-400" />
                      <span>Консультант думает...</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 p-4">
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                      maxLength={600}
                      disabled={loading || sessionCount >= MAX_SESSION_MESSAGES}
                      placeholder="Спросите про задачи, команду, конкурсы..."
                      className="flex-grow rounded-xl border border-white/10 bg-[#122e41] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400/50 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => sendMessage(input)}
                      disabled={loading || !input.trim() || sessionCount >= MAX_SESSION_MESSAGES}
                      className="rounded-xl bg-yellow-500 p-3 text-black transition-colors hover:bg-yellow-400 disabled:opacity-40"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-gray-600">
                    Консультант, не исполнитель · до {MAX_SESSION_MESSAGES} сообщений за сессию
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedItem && (
        <InfoModal data={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
};
