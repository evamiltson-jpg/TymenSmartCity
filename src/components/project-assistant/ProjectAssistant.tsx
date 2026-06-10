import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AiHistoryMessage,
  ASSISTANT_NAME,
  buildEventsContext,
  MAX_SESSION_MESSAGES,
  PROJECT_QUICK_PROMPTS,
  ProjectBrief,
  getSessionWarning,
  myProjectToBrief,
  projectBriefToContext,
  sendAiMessage,
} from '../../services/aiService';
import { parseAiLinks } from '../../utils/parseAiLinks';
import type { AiLinkClickPayload } from '../../utils/parseAiLinks';
import { InfoModal } from '../InfoModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchMyProjectById,
  fetchMySubmittedProjects,
  updateMyProject,
  type MyProjectDetail,
  type SubmittedProject,
} from '../../services/projectService';
import {
  archiveAndReset,
  deleteArchive,
  loadChatState,
  saveChatState,
  type StoredChatMessage,
} from '../../utils/chatStorage';
import { moderateUserMessage } from '../../utils/chatModeration';
import {
  extractProposals,
  extractTimelineItems,
  stripProposals,
  type ProshaProposal,
} from '../../utils/proshaSuggestions';
import { resolveEventLink, resolveProjectCard } from '../../utils/resolveAiCard';
import { ProshaProposalCard } from './ProshaProposalCard';

const BRIEF_KEY = 'project_assistant_brief_v2';
const CHAT_KEY = 'prosha_chat_v1';

const WELCOME: StoredChatMessage = {
  role: 'ai',
  text: `Привет! Я ${ASSISTANT_NAME} — помогу с идеей, планом, командой и конкурсами.\n\nПривяжите проект из профиля или просто задайте вопрос.`,
};

const STAGE_OPTIONS: { value: ProjectBrief['stage']; label: string }[] = [
  { value: 'idea', label: 'Идея' },
  { value: 'development', label: 'Разработка' },
  { value: 'mvp', label: 'MVP' },
  { value: 'pitch', label: 'Питч' },
];

const isSystemNotice = (text: string) => text.startsWith('[');

const defaultBrief: ProjectBrief = {
  linkedProjectId: null,
  title: '',
  description: '',
  stage: 'idea',
  technologies: [],
};

function loadBrief(): ProjectBrief {
  try {
    const raw = localStorage.getItem(BRIEF_KEY);
    if (raw) return { ...defaultBrief, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...defaultBrief };
}

interface ChatMessage extends StoredChatMessage {
  proposals?: ProshaProposal[];
  dismissedProposals?: boolean;
}

export const ProjectAssistant: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const chatInit = loadChatState(CHAT_KEY, WELCOME);

  const [brief, setBrief] = useState<ProjectBrief>(loadBrief);
  const [linkedDetail, setLinkedDetail] = useState<MyProjectDetail | null>(null);
  const [myProjects, setMyProjects] = useState<SubmittedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [linkingProject, setLinkingProject] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(chatInit.messages);
  const [archives, setArchives] = useState(chatInit.archives);
  const [viewArchiveId, setViewArchiveId] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(chatInit.sessionCount);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingProposal, setSavingProposal] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [timelinePreview, setTimelinePreview] = useState<{ week: string; title: string }[]>([]);
  const [eventsContext, setEventsContext] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayedMessages = viewArchiveId
    ? (archives.find((a) => a.id === viewArchiveId)?.messages as ChatMessage[]) ?? messages
    : messages;

  const sessionLimitReached = !viewArchiveId && sessionCount >= MAX_SESSION_MESSAGES;

  useEffect(() => {
    localStorage.setItem(BRIEF_KEY, JSON.stringify(brief));
  }, [brief]);

  useEffect(() => {
    if (!viewArchiveId) {
      saveChatState(CHAT_KEY, { messages, sessionCount, archives });
    }
  }, [messages, sessionCount, archives, viewArchiveId]);

  useEffect(() => {
    buildEventsContext().then(setEventsContext).catch(() => setEventsContext(''));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayedMessages, loading]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setMyProjects([]);
      return;
    }
    setLoadingProjects(true);
    fetchMySubmittedProjects(user.id)
      .then(setMyProjects)
      .catch(() => setMyProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!brief.linkedProjectId || !user?.id) {
      setLinkedDetail(null);
      return;
    }
    let cancelled = false;
    fetchMyProjectById(brief.linkedProjectId, user.id)
      .then((d) => {
        if (!cancelled) setLinkedDetail(d);
      })
      .catch(() => {
        if (!cancelled) setLinkedDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [brief.linkedProjectId, user?.id]);

  const buildApiHistory = useCallback((): AiHistoryMessage[] => {
    return messages
      .slice(-8)
      .map((m) => ({
        role: (m.role === 'ai' ? 'assistant' : 'user') as AiHistoryMessage['role'],
        content: m.text,
      }));
  }, [messages]);

  const handleLinkClick = async ({ type, id, label }: AiLinkClickPayload) => {
    if (type === 'событие') {
      const link = await resolveEventLink(id);
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    if (type === 'проект') {
      const card = await resolveProjectCard(id, label);
      if (card) setSelectedItem(card);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    if (!projectId) {
      setBrief((b) => ({ ...b, linkedProjectId: null }));
      setLinkedDetail(null);
      return;
    }
    if (!user?.id) return;

    setLinkingProject(true);
    try {
      const detail = await fetchMyProjectById(projectId, user.id);
      if (!detail) {
        alert('Не удалось загрузить проект.');
        return;
      }
      setBrief(myProjectToBrief(detail));
      setLinkedDetail(detail);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `Проект «${detail.title}» привязан. Советы будут учитывать его данные.`,
        },
      ]);
    } catch {
      alert('Ошибка загрузки проекта.');
    } finally {
      setLinkingProject(false);
    }
  };

  const applyProposalLocally = (proposal: ProshaProposal) => {
    setBrief((b) => {
      const next = { ...b };
      if (proposal.field === 'title') next.title = proposal.value;
      if (proposal.field === 'description') next.description = proposal.value;
      if (proposal.field === 'problem') {
        next.description = [proposal.value, b.description].filter(Boolean).join('\n\n');
      }
      if (proposal.field === 'expected_result') {
        next.description = [b.description, `Результат: ${proposal.value}`].filter(Boolean).join('\n\n');
      }
      if (proposal.field === 'status') {
        if (/mvp/i.test(proposal.value)) next.stage = 'mvp';
        else if (/питч|защит/i.test(proposal.value)) next.stage = 'pitch';
        else if (/разраб|работ/i.test(proposal.value)) next.stage = 'development';
      }
      return next;
    });
  };

  const handleAcceptProposal = async (msgIndex: number, proposal: ProshaProposal) => {
    setSavingProposal(true);
    try {
      if (brief.linkedProjectId && user?.id && linkedDetail) {
        const payload = {
          title: proposal.field === 'title' ? proposal.value : linkedDetail.title,
          problem: proposal.field === 'problem' ? proposal.value : linkedDetail.problem,
          description: proposal.field === 'description' ? proposal.value : linkedDetail.description,
          expected_result:
            proposal.field === 'expected_result' ? proposal.value : linkedDetail.expected_result,
          note: linkedDetail.note ?? null,
          category: linkedDetail.category,
          status: proposal.field === 'status' ? proposal.value : linkedDetail.status,
        };
        await updateMyProject(brief.linkedProjectId, user.id, payload);
        const refreshed = await fetchMyProjectById(brief.linkedProjectId, user.id);
        if (refreshed) {
          setLinkedDetail(refreshed);
          setBrief(myProjectToBrief(refreshed));
        }
      } else {
        applyProposalLocally(proposal);
      }

      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex ? { ...m, proposals: undefined, dismissedProposals: true } : m,
        ),
      );
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: `Записано в проект: ${proposal.label}.` },
      ]);
    } catch {
      alert('Не удалось сохранить. Попробуйте в профиле вручную.');
    } finally {
      setSavingProposal(false);
    }
  };

  const handleRejectProposal = (msgIndex: number) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === msgIndex ? { ...m, proposals: undefined, dismissedProposals: true } : m,
      ),
    );
  };

  const deleteArchiveChat = (archiveId: string) => {
    const next = deleteArchive(CHAT_KEY, archiveId, { messages, sessionCount, archives });
    setArchives(next.archives);
    if (viewArchiveId === archiveId) setViewArchiveId(null);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || viewArchiveId) return;

    if (sessionLimitReached) return;

    const moderation = moderateUserMessage(trimmed, 'project');
    setInput('');

    if (moderation.blocked) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: trimmed },
        { role: 'ai', text: moderation.reply ?? 'Сообщение не принято.' },
      ]);
      return;
    }

    const priorHistory = buildApiHistory();
    const nextCount = sessionCount + 1;
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);
    setSessionCount(nextCount);

    const warnText = getSessionWarning(MAX_SESSION_MESSAGES - nextCount);

    try {
      const rawReply = await sendAiMessage({
        mode: 'project',
        message: trimmed,
        history: priorHistory,
        eventsContext,
        projectContext: projectBriefToContext(brief, linkedDetail),
      });

      const proposals = extractProposals(rawReply);
      const cleanReply = stripProposals(rawReply);

      setMessages((prev) => {
        const next: ChatMessage[] = [
          ...prev,
          {
            role: 'ai',
            text: cleanReply,
            proposals: proposals.length ? proposals : undefined,
          },
        ];
        if (warnText) next.push({ role: 'ai', text: warnText });
        if (nextCount >= MAX_SESSION_MESSAGES) {
          next.push({
            role: 'ai',
            text: `[Лимит] Сессия завершена. Диалог сохранён — можно перечитать. Новые вопросы через «Новая сессия».`,
          });
        }
        return next;
      });

      if (/таймлайн|недел|этап/i.test(trimmed) || /недел/i.test(cleanReply)) {
        const items = extractTimelineItems(cleanReply);
        if (items.length) setTimelinePreview(items);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: `${ASSISTANT_NAME} не смогла ответить: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    const next = archiveAndReset(CHAT_KEY, WELCOME, { messages, sessionCount, archives });
    setMessages(next.messages);
    setArchives(next.archives);
    setSessionCount(0);
    setViewArchiveId(null);
    setTimelinePreview([]);
  };

  const addTech = () => {
    const t = techInput.trim();
    if (!t || brief.technologies.includes(t)) return;
    setBrief((b) => ({ ...b, technologies: [...b.technologies, t].slice(0, 8) }));
    setTechInput('');
  };

  const remaining = MAX_SESSION_MESSAGES - sessionCount;
  const sessionProgress = Math.min(100, (sessionCount / MAX_SESSION_MESSAGES) * 100);
  const isLowSession = remaining <= 15 && remaining > 0 && !sessionLimitReached;

  return (
    <>
      <section className="relative mb-20 mt-20 overflow-hidden rounded-[50px] border border-white/5 bg-[#0b2234]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="assistant-orb assistant-orb-1" />
          <div className="assistant-orb assistant-orb-2" />
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-sky-500/5" />
        </div>

        <div className="relative p-8 md:p-14">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-400">
              {ASSISTANT_NAME} · консультант по проекту
            </div>
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Придумайте. Спланируйте. Запустите.</h2>
            <p className="mx-auto max-w-2xl text-sm text-gray-400">
              {ASSISTANT_NAME} помогает оформить идею, собрать команду и найти конкурсы.
              Привяжите свой проект — советы станут точнее.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
            <div className="space-y-6 lg:col-span-4">
              <div className="rounded-[28px] border border-white/10 bg-[#122e41]/80 p-6 backdrop-blur-md">
                <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-yellow-400">
                  Ваш проект
                </h3>

                {isAuthenticated ? (
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Привязать проект
                    </label>
                    <select
                      value={brief.linkedProjectId ?? ''}
                      disabled={linkingProject || loadingProjects}
                      onChange={(e) => handleSelectProject(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0b2234] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400/50 disabled:opacity-50"
                    >
                      <option value="">— Новая идея —</option>
                      {myProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                    {brief.linkedProjectId && linkedDetail && (
                      <p className="mt-2 rounded-lg bg-yellow-400/10 px-3 py-2 text-[11px] text-yellow-300">
                        Привязан: {linkedDetail.title}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mb-4 rounded-xl border border-white/5 bg-[#0b2234]/60 px-4 py-3 text-xs text-gray-500">
                    Войдите, чтобы привязать проект из профиля.
                  </p>
                )}

                <input
                  value={brief.title}
                  onChange={(e) => setBrief((b) => ({ ...b, title: e.target.value }))}
                  placeholder="Название..."
                  className="mb-3 w-full rounded-xl border border-white/10 bg-[#0b2234] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400/50"
                />
                <textarea
                  value={brief.description}
                  onChange={(e) => setBrief((b) => ({ ...b, description: e.target.value }))}
                  placeholder="О чём проект?"
                  rows={3}
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
                  <button type="button" onClick={addTech} className="rounded-xl bg-white/10 px-3 text-xs font-bold hover:bg-white/20">
                    +
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[#122e41]/60 p-6 backdrop-blur-md">
                <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-white/70">
                  Таймлайн
                </h3>
                {timelinePreview.length > 0 ? (
                  <div className="relative ml-3 max-h-48 space-y-3 overflow-y-auto border-l-2 border-yellow-400/30 pl-6 custom-scrollbar">
                    {timelinePreview.map((item, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-[#122e41] bg-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400/80">
                          Неделя {item.week}
                        </span>
                        <p className="text-sm text-white/90">{item.title}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Спросите про таймлайн — этапы появятся здесь.</p>
                )}
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#0b2234]/60 p-4">
                <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <span>Сессия</span>
                  <span className={isLowSession || sessionLimitReached ? 'text-yellow-400' : ''}>
                    {sessionCount}/{MAX_SESSION_MESSAGES}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${isLowSession ? 'bg-orange-400' : 'bg-yellow-400'}`}
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

            <div className="flex min-h-[520px] flex-col lg:col-span-8">
              <div className="mb-4 flex flex-wrap gap-2">
                {PROJECT_QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    disabled={loading || sessionLimitReached || !!viewArchiveId}
                    onClick={() => sendMessage(q.prompt)}
                    className="rounded-xl border border-white/10 bg-[#122e41]/80 px-3 py-2 text-[11px] font-bold text-gray-300 transition-all hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300 disabled:opacity-40"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {archives.length > 0 && (
                <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setViewArchiveId(null)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                      !viewArchiveId ? 'bg-yellow-400/20 text-yellow-300' : 'bg-white/5 text-gray-500'
                    }`}
                  >
                    Текущий чат
                  </button>
                  {archives.map((a) => (
                    <div
                      key={a.id}
                      className={`flex shrink-0 items-center overflow-hidden rounded-lg ${
                        viewArchiveId === a.id ? 'bg-yellow-400/20' : 'bg-white/5'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setViewArchiveId(a.id)}
                        className={`max-w-[120px] truncate px-2.5 py-1 text-[10px] font-bold ${
                          viewArchiveId === a.id ? 'text-yellow-300' : 'text-gray-500'
                        }`}
                      >
                        {a.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteArchiveChat(a.id)}
                        title="Удалить из архива"
                        className="px-1.5 py-1 text-[11px] text-gray-600 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0f2536]/90 backdrop-blur-md">
                <div ref={scrollRef} className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                  {displayedMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-yellow-500 font-medium text-black'
                            : isSystemNotice(m.text)
                              ? 'border border-orange-400/30 bg-orange-950/40 text-orange-100'
                              : 'bg-[#1a3a4d] text-white/95'
                        }`}
                      >
                        {m.role === 'ai' && !isSystemNotice(m.text)
                          ? parseAiLinks(m.text, { onLinkClick: handleLinkClick })
                          : m.text}
                        {m.proposals?.map((p, pi) => (
                          <ProshaProposalCard
                            key={pi}
                            proposal={p}
                            saving={savingProposal}
                            onAccept={() => handleAcceptProposal(i, p)}
                            onReject={() => handleRejectProposal(i)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-white/40">
                      <span className="assistant-typing-dot" />
                      <span className="assistant-typing-dot animation-delay-200" />
                      <span>{ASSISTANT_NAME} думает...</span>
                    </div>
                  )}
                </div>

                <div className="flex-none border-t border-white/5 p-4">
                  {viewArchiveId ? (
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                      <span>
                        Архив — только просмотр.{' '}
                        <button type="button" className="text-yellow-400 underline" onClick={() => setViewArchiveId(null)}>
                          Вернуться
                        </button>
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteArchiveChat(viewArchiveId)}
                        className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-bold text-gray-400 hover:border-red-400/30 hover:text-red-300"
                      >
                        Удалить
                      </button>
                    </div>
                  ) : sessionLimitReached ? (
                    <p className="text-center text-xs text-orange-300">
                      Лимит исчерпан — чат сохранён. Нажмите «Новая сессия», чтобы продолжить.
                    </p>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                        maxLength={600}
                        disabled={loading}
                        placeholder={`Спросите ${ASSISTANT_NAME}...`}
                        className="flex-grow rounded-xl border border-white/10 bg-[#122e41] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400/50 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => sendMessage(input)}
                        disabled={loading || !input.trim()}
                        className="rounded-xl bg-yellow-500 p-3 text-black transition-colors hover:bg-yellow-400 disabled:opacity-40"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedItem && <InfoModal data={selectedItem as React.ComponentProps<typeof InfoModal>['data']} onClose={() => setSelectedItem(null)} />}
    </>
  );
};
