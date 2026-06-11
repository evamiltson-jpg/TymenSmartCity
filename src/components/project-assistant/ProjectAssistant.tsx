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
import type { AiLinkClickPayload } from '../../utils/parseAiLinks';
import { renderAiMessage } from '../../utils/formatAiMessage';
import { InfoModal } from '../InfoModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchMyProjectById,
  fetchMySubmittedProjects,
  fetchProjectWorkspace,
  getProjectModerationInfo,
  isProjectOnSite,
  saveProjectWorkspace,
  updateMyProject,
  type MyProjectDetail,
  type SubmittedProject,
} from '../../services/projectService';
import {
  emptyProshaState,
  fetchProshaChat,
  saveProshaChat,
} from '../../services/proshaChatService';
import {
  archiveAndResetState,
  deleteArchiveState,
  getLocalDayKey,
  getSessionLimitHint,
  loadGuestChatState,
  saveGuestChatState,
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

const STAGE_OPTIONS: { value: ProjectBrief['stage']; label: string }[] = [
  { value: 'idea', label: 'Идея' },
  { value: 'development', label: 'Разработка' },
  { value: 'mvp', label: 'MVP' },
  { value: 'pitch', label: 'Питч' },
];

const isSystemNotice = (text: string) => text.startsWith('[');

const parseTechnologies = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);

interface ChatMessage extends StoredChatMessage {
  proposals?: ProshaProposal[];
  dismissedProposals?: boolean;
}

export const ProjectAssistant: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const emptyState = emptyProshaState();

  const [brief, setBrief] = useState<ProjectBrief>(emptyState.brief);
  const [linkedDetail, setLinkedDetail] = useState<MyProjectDetail | null>(null);
  const [myProjects, setMyProjects] = useState<SubmittedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [linkingProject, setLinkingProject] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [archives, setArchives] = useState(emptyState.archives);
  const [viewArchiveId, setViewArchiveId] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [chatReady, setChatReady] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<'chat' | 'project'>('chat');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingProposal, setSavingProposal] = useState(false);
  const [savingSidebar, setSavingSidebar] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [timelinePreview, setTimelinePreview] = useState<{ week: string; title: string }[]>([]);
  const [eventsContext, setEventsContext] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const sessionDayRef = useRef(getLocalDayKey());

  const displayedMessages = viewArchiveId
    ? (archives.find((a) => a.id === viewArchiveId)?.messages as ChatMessage[]) ?? messages
    : messages;

  const sessionLimitReached = !viewArchiveId && sessionCount >= MAX_SESSION_MESSAGES;

  useEffect(() => {
    let cancelled = false;

    const applyEmpty = () => {
      const empty = emptyProshaState();
      setMessages(empty.messages);
      setArchives(empty.archives);
      setSessionCount(empty.sessionCount);
      setBrief(empty.brief);
      setTimelinePreview(empty.timeline);
      setViewArchiveId(null);
    };

    const loadChat = async () => {
      setChatLoading(true);
      setChatReady(false);

      if (!user?.id) {
        activeUserIdRef.current = null;
        const guest = loadGuestChatState();
        if (cancelled) return;
        setMessages(guest.messages as ChatMessage[]);
        setArchives(guest.archives);
        setSessionCount(guest.sessionCount);
        setBrief(emptyProshaState().brief);
        setTimelinePreview([]);
        setViewArchiveId(null);
        sessionDayRef.current = guest.sessionDay ?? getLocalDayKey();
        setChatLoading(false);
        setChatReady(true);
        return;
      }

      activeUserIdRef.current = user.id;
      try {
        const data = await fetchProshaChat(user.id);
        if (cancelled) return;
        if (data) {
          setMessages(data.messages as ChatMessage[]);
          setArchives(data.archives);
          setSessionCount(data.sessionCount);
          setBrief(data.brief);
          setTimelinePreview(data.timeline);
          sessionDayRef.current = data.sessionDay ?? getLocalDayKey();
        } else {
          applyEmpty();
          sessionDayRef.current = getLocalDayKey();
        }
        setViewArchiveId(null);
      } catch {
        if (!cancelled) applyEmpty();
      } finally {
        if (!cancelled) {
          setChatLoading(false);
          setChatReady(true);
        }
      }
    };

    loadChat();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!chatReady || viewArchiveId) return;

    if (!user?.id) {
      saveGuestChatState({
        messages,
        sessionCount,
        archives,
        sessionDay: getLocalDayKey(),
      });
      return;
    }

    const userId = user.id;
    const timer = window.setTimeout(() => {
      if (activeUserIdRef.current !== userId) return;
      saveProshaChat(userId, {
        messages,
        sessionCount,
        archives,
        sessionDay: getLocalDayKey(),
        brief,
        timeline: timelinePreview,
      }).catch(() => undefined);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [messages, sessionCount, archives, brief, timelinePreview, user?.id, chatReady, viewArchiveId]);

  useEffect(() => {
    if (!chatReady) return;
    const id = window.setInterval(() => {
      const today = getLocalDayKey();
      if (sessionDayRef.current !== today) {
        sessionDayRef.current = today;
        setSessionCount(0);
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [chatReady]);

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
      fetchProjectWorkspace(projectId, user.id)
        .then((ws) => {
          if (ws.timeline?.length) setTimelinePreview(ws.timeline);
        })
        .catch(() => undefined);
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
      if (proposal.field === 'technologies') {
        next.technologies = parseTechnologies(proposal.value);
      }
      return next;
    });
  };

  const buildProjectPayloadFromProposal = (
    proposal: ProshaProposal,
    detail: MyProjectDetail,
    localBrief: ProjectBrief,
  ) => ({
    title: proposal.field === 'title' ? proposal.value : localBrief.title || detail.title,
    problem: proposal.field === 'problem' ? proposal.value : detail.problem,
    description:
      proposal.field === 'description' ? proposal.value : localBrief.description || detail.description,
    expected_result:
      proposal.field === 'expected_result' ? proposal.value : detail.expected_result,
    note: detail.note ?? null,
    category: detail.category,
    status: proposal.field === 'status' ? proposal.value : detail.status,
    technologies:
      proposal.field === 'technologies'
        ? parseTechnologies(proposal.value)
        : localBrief.technologies.length
          ? localBrief.technologies
          : detail.technologies,
  });

  const handleAcceptProposal = async (msgIndex: number, proposal: ProshaProposal) => {
    setSavingProposal(true);
    try {
      let withdrawn = false;

      if (brief.linkedProjectId && user?.id && linkedDetail) {
        const result = await updateMyProject(
          brief.linkedProjectId,
          user.id,
          buildProjectPayloadFromProposal(proposal, linkedDetail, brief),
        );
        withdrawn = result.withdrawnFromSite;
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
      const followUp = withdrawn
        ? `Записано: ${proposal.label}. Проект снят с сайта на время правок — снова на модерации, появится примерно через час.`
        : `Записано в проект: ${proposal.label}.`;
      setMessages((prev) => [...prev, { role: 'ai', text: followUp }]);
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
    const next = deleteArchiveState(archiveId, { messages, sessionCount, archives });
    setArchives(next.archives);
    if (viewArchiveId === archiveId) setViewArchiveId(null);
  };

  const sendMessage = async (text: string, options?: { apiMessage?: string }) => {
    const displayText = text.trim();
    const apiText = (options?.apiMessage ?? text).trim();
    if (!displayText || !apiText || loading || viewArchiveId) return;

    if (sessionLimitReached) return;

    const moderation = moderateUserMessage(apiText, 'project');
    setInput('');

    if (moderation.blocked) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: displayText },
        { role: 'ai', text: moderation.reply ?? 'Сообщение не принято.' },
      ]);
      return;
    }

    const priorHistory = buildApiHistory();
    const nextCount = sessionCount + 1;
    setMessages((prev) => [...prev, { role: 'user', text: displayText }]);
    setLoading(true);
    setSessionCount(nextCount);

    const warnText = getSessionWarning(MAX_SESSION_MESSAGES - nextCount);

    try {
      const rawReply = await sendAiMessage({
        mode: 'project',
        message: apiText,
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
            text: `[Лимит] Сессия завершена (${MAX_SESSION_MESSAGES} сообщений). Диалог сохранён в архиве. ${getSessionLimitHint()}`,
          });
        }
        return next;
      });

      if (/таймлайн|недел|этап/i.test(apiText) || /недел/i.test(cleanReply)) {
        const items = extractTimelineItems(cleanReply);
        if (items.length) {
          setTimelinePreview(items);
          if (brief.linkedProjectId && user?.id) {
            saveProjectWorkspace(brief.linkedProjectId, user.id, { timeline: items }).catch(() => undefined);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      const isRateLimit = /лимит|rate limit|Groq|Gemini|подождите|ИИ временно/i.test(msg);
      if (isRateLimit) {
        setSessionCount((c) => Math.max(0, c - 1));
      }
      const text = isRateLimit
        ? `[ИИ временно недоступен]\n${msg}`
        : `${ASSISTANT_NAME} не смогла ответить: ${msg}`;
      setMessages((prev) => [...prev, { role: 'ai', text }]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    const next = archiveAndResetState(null, {
      messages,
      sessionCount,
      archives,
      sessionDay: getLocalDayKey(),
    });
    setMessages(next.messages as ChatMessage[]);
    setArchives(next.archives);
    setSessionCount(0);
    setViewArchiveId(null);
    setTimelinePreview([]);
    setMobileTab('chat');
  };

  const addTech = () => {
    const t = techInput.trim();
    if (!t || brief.technologies.includes(t)) return;
    setBrief((b) => ({ ...b, technologies: [...b.technologies, t].slice(0, 12) }));
    setTechInput('');
  };

  const removeTech = (tech: string) => {
    setBrief((b) => ({ ...b, technologies: b.technologies.filter((t) => t !== tech) }));
  };

  const saveSidebarToProject = async () => {
    if (!brief.linkedProjectId || !user?.id || !linkedDetail) return;

    setSavingSidebar(true);
    try {
      const result = await updateMyProject(brief.linkedProjectId, user.id, {
        title: brief.title.trim() || linkedDetail.title,
        problem: linkedDetail.problem,
        description: brief.description.trim() || linkedDetail.description,
        expected_result: linkedDetail.expected_result,
        note: linkedDetail.note ?? null,
        category: linkedDetail.category,
        status: linkedDetail.status,
        technologies: brief.technologies,
      });

      if (timelinePreview.length) {
        await saveProjectWorkspace(brief.linkedProjectId, user.id, { timeline: timelinePreview });
      }

      const refreshed = await fetchMyProjectById(brief.linkedProjectId, user.id);
      if (refreshed) {
        setLinkedDetail(refreshed);
        setBrief(myProjectToBrief(refreshed));
      }

      if (result.withdrawnFromSite) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: '[Модерация] Проект снят с сайта на время правок. Снова на модерации — появится примерно через час.',
          },
        ]);
      }
    } catch {
      alert('Не удалось сохранить изменения в проект.');
    } finally {
      setSavingSidebar(false);
    }
  };

  const remaining = MAX_SESSION_MESSAGES - sessionCount;
  const sessionProgress = Math.min(100, (sessionCount / MAX_SESSION_MESSAGES) * 100);
  const isLowSession = remaining <= 15 && remaining > 0 && !sessionLimitReached;
  const linkedOnSite = linkedDetail ? isProjectOnSite(linkedDetail) : false;
  const moderationInfo = linkedDetail ? getProjectModerationInfo(linkedDetail) : null;

  return (
    <>
      <section className="relative mb-20 mt-20 overflow-hidden rounded-[50px] border border-white/5 bg-[#0b2234]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="assistant-orb assistant-orb-1" />
          <div className="assistant-orb assistant-orb-2" />
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-sky-500/5" />
        </div>

        <div className="relative p-4 sm:p-8 md:p-14">
          <div className="mb-6 text-center md:mb-10">
            <div className="mb-4 inline-flex items-center rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-400">
              {ASSISTANT_NAME} · консультант по проекту
            </div>
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Придумайте. Спланируйте. Запустите.</h2>
            <p className="mx-auto max-w-2xl text-sm text-gray-400">
              {ASSISTANT_NAME} помогает оформить идею, собрать команду и найти конкурсы.
              Привяжите свой проект — советы станут точнее.
            </p>
          </div>

          <div className="mb-4 flex gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                mobileTab === 'chat'
                  ? 'bg-yellow-400 text-black'
                  : 'border border-white/10 bg-white/5 text-gray-400'
              }`}
            >
              Чат
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('project')}
              className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                mobileTab === 'project'
                  ? 'bg-yellow-400 text-black'
                  : 'border border-white/10 bg-white/5 text-gray-400'
              }`}
            >
              Проект
            </button>
          </div>

          <div className="prosha-panel grid min-h-0 grid-cols-1 gap-4 overflow-hidden sm:gap-6 lg:grid-cols-12 lg:grid-rows-1 lg:items-stretch">
            <div
              className={`h-full min-h-0 flex-col gap-4 overflow-hidden lg:col-span-4 ${
                mobileTab === 'project' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              <div className="custom-scrollbar-field min-h-0 max-h-[45%] shrink-0 overflow-y-auto rounded-[28px] border border-white/10 bg-[#122e41]/80 p-4 backdrop-blur-md sm:max-h-[52%] sm:p-6">
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
                      <div className="mt-2 space-y-1 rounded-lg bg-yellow-400/10 px-3 py-2 text-[11px] text-yellow-300">
                        <p>Привязан: {linkedDetail.title}</p>
                        {moderationInfo && (
                          <p className="text-yellow-200/80">{moderationInfo.hint}</p>
                        )}
                        {linkedOnSite && (
                          <p className="text-orange-200/90">
                            При сохранении правок проект временно уберётся с сайта на ~1 час.
                          </p>
                        )}
                      </div>
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
                  className="custom-scrollbar mb-4 w-full resize-none rounded-xl border border-white/10 bg-[#0b2234] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400/50"
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
                {brief.technologies.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {brief.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-gray-200"
                      >
                        {tech}
                        <button
                          type="button"
                          onClick={() => removeTech(tech)}
                          className="text-gray-500 hover:text-red-300"
                          aria-label={`Убрать ${tech}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTech()}
                    placeholder="Добавить технологию..."
                    className="flex-grow rounded-xl border border-white/10 bg-[#0b2234] px-3 py-2 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={addTech}
                    className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:border-yellow-400/30 hover:text-yellow-300"
                  >
                    Добавить
                  </button>
                </div>
                {brief.linkedProjectId && linkedDetail && (
                  <button
                    type="button"
                    onClick={saveSidebarToProject}
                    disabled={savingSidebar}
                    className="mt-4 w-full rounded-xl bg-yellow-500 py-2.5 text-[11px] font-black uppercase tracking-widest text-black transition-colors hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {savingSidebar ? 'Сохранение...' : 'Сохранить в проект'}
                  </button>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/10 bg-[#122e41]/60 p-6 backdrop-blur-md">
                <h3 className="mb-4 shrink-0 text-xs font-black uppercase tracking-widest text-white/70">
                  Таймлайн
                </h3>
                {timelinePreview.length > 0 ? (
                  <div className="relative ml-3 min-h-0 flex-1 space-y-3 overflow-y-auto border-l-2 border-yellow-400/30 pl-6 custom-scrollbar">
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

              <div className="shrink-0 rounded-2xl border border-white/5 bg-[#0b2234]/60 p-4">
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
                {sessionLimitReached && (
                  <p className="mt-2 text-[10px] leading-snug text-orange-300/90">{getSessionLimitHint()}</p>
                )}
                <button
                  type="button"
                  onClick={resetSession}
                  className="mt-3 w-full rounded-xl border border-white/10 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:border-yellow-400/30 hover:text-yellow-400"
                >
                  Новая сессия
                </button>
              </div>
            </div>

            <div
              className={`h-full min-h-0 flex-col overflow-hidden lg:col-span-8 ${
                mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0f2536]/90 backdrop-blur-md">
                <div className="flex-none border-b border-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
                  {!isAuthenticated && (
                    <p className="mb-2 text-center text-[10px] leading-snug text-yellow-400/80">
                      Войдите в аккаунт — история чата сохранится только у вас.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {PROJECT_QUICK_PROMPTS.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        disabled={loading || chatLoading || sessionLimitReached || !!viewArchiveId}
                        onClick={() => sendMessage(q.userText, { apiMessage: q.apiPrompt })}
                        className="rounded-xl border border-white/10 bg-[#122e41]/80 px-3 py-1.5 text-[11px] font-bold text-gray-300 transition-all hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300 disabled:opacity-40"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {archives.length > 0 && (
                  <div className="flex flex-none gap-2 overflow-x-auto border-b border-white/5 px-4 py-2 scrollbar-hide">
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

                <div ref={scrollRef} className="custom-scrollbar flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-3 sm:p-5">
                  {chatLoading && (
                    <div className="flex flex-1 items-center justify-center py-12 text-xs text-gray-500">
                      Загрузка вашего чата...
                    </div>
                  )}
                  {!chatLoading && displayedMessages.length === 0 && !loading && (
                    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center text-gray-500">
                      <p className="text-sm text-white/85">
                        Здравствуйте! Я {ASSISTANT_NAME} — помогу с идеей, планом, командой и конкурсами.
                      </p>
                      <p className="mt-2 max-w-sm text-xs leading-relaxed">
                        Напишите вопрос или выберите подсказку выше. Привяжите проект во вкладке «Проект» — советы
                        станут точнее.
                      </p>
                    </div>
                  )}
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
                          ? renderAiMessage(m.text, { onLinkClick: handleLinkClick })
                          : m.text}
                        {m.proposals?.map((p, pi) => (
                          <ProshaProposalCard
                            key={pi}
                            proposal={p}
                            saving={savingProposal}
                            linkedProject={!!brief.linkedProjectId}
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

                <div className="flex-none border-t border-white/5 p-3 sm:p-4">
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
                    <p className="text-center text-xs text-orange-300">{getSessionLimitHint()}</p>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                        maxLength={600}
                        disabled={loading || chatLoading}
                        placeholder={`Спросите ${ASSISTANT_NAME}...`}
                        className="flex-grow rounded-xl border border-white/10 bg-[#122e41] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-yellow-400/50 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => sendMessage(input)}
                        disabled={loading || chatLoading || !input.trim()}
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
