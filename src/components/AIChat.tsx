import React, { useEffect, useRef, useState } from 'react';
import { InfoModal } from './InfoModal';
import {
  AiHistoryMessage,
  buildCityContext,
  CITY_QUICK_PROMPTS,
  sendAiMessage,
  submitComplaint,
} from '../services/aiService';
import { parseAiLinks } from '../utils/parseAiLinks';
import type { AiLinkClickPayload } from '../utils/parseAiLinks';
import {
  resolveEventLink,
  resolveProjectCard,
  resolveServiceCard,
  SITE_SECTIONS,
} from '../utils/resolveAiCard';
import {
  archiveAndReset,
  loadChatState,
  saveChatState,
  type StoredChatMessage,
} from '../utils/chatStorage';

const STORAGE_KEY = 'city_chat_v1';
const WELCOME: StoredChatMessage = {
  role: 'ai',
  text: 'Здравствуйте! Помогу найти сервис, проект или раздел на портале «Умный город Тюмень».',
};

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose, onNavigate }) => {
  const initial = loadChatState(STORAGE_KEY, WELCOME);
  const [messages, setMessages] = useState<StoredChatMessage[]>(initial.messages);
  const [archives, setArchives] = useState(initial.archives);
  const [viewArchiveId, setViewArchiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [complaintSending, setComplaintSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cityContextRef = useRef<string | null>(null);

  const displayedMessages =
    viewArchiveId
      ? archives.find((a) => a.id === viewArchiveId)?.messages ?? messages
      : messages;

  useEffect(() => {
    if (!viewArchiveId) {
      saveChatState(STORAGE_KEY, { messages, sessionCount: 0, archives });
    }
  }, [messages, archives, viewArchiveId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayedMessages, loading, showComplaintForm]);

  useEffect(() => {
    if (isOpen && !cityContextRef.current) {
      buildCityContext()
        .then((ctx) => {
          cityContextRef.current = ctx;
        })
        .catch(() => {
          cityContextRef.current = '';
        });
    }
  }, [isOpen]);

  const buildApiHistory = (): AiHistoryMessage[] =>
    messages.slice(-8).map((m) => ({
      role: (m.role === 'ai' ? 'assistant' : 'user') as AiHistoryMessage['role'],
      content: m.text,
    }));

  const handleLinkClick = async ({ type, id, label }: AiLinkClickPayload) => {
    if (type === 'раздел') {
      const section = SITE_SECTIONS[id];
      if (section) {
        onClose();
        onNavigate(section.page);
      }
      return;
    }

    if (type === 'событие') {
      const link = await resolveEventLink(id);
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
      else alert('Ссылка на мероприятие не найдена.');
      return;
    }

    if (type === 'сервис') {
      const card = await resolveServiceCard(id, label);
      if (!card) {
        onClose();
        onNavigate('services');
        return;
      }
      setSelectedItem(card);
      return;
    }

    if (type === 'проект') {
      const card = await resolveProjectCard(id, label);
      if (!card) {
        onClose();
        onNavigate('projects');
        return;
      }
      setSelectedItem(card);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const userMsg = (overrideText ?? input).trim();
    if (!userMsg || loading || viewArchiveId) return;

    if (/сообщить об ошибк|жалоб|баг|не работает|сломал/i.test(userMsg)) {
      setShowComplaintForm(true);
      setComplaintText(userMsg);
    }

    setInput('');
    const priorHistory = buildApiHistory();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      if (!cityContextRef.current) {
        cityContextRef.current = await buildCityContext();
      }

      const reply = await sendAiMessage({
        mode: 'city',
        message: userMsg,
        history: priorHistory,
        cityContext: cityContextRef.current,
      });

      setMessages((prev) => [...prev, { role: 'ai', text: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
      setMessages((prev) => [...prev, { role: 'ai', text: `Не получилось ответить: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintSubmit = async () => {
    const text = complaintText.trim();
    if (!text || complaintSending) return;

    setComplaintSending(true);
    try {
      const reply = await submitComplaint({
        description: text,
        page: window.location.hash || 'main',
      });
      setMessages((prev) => [...prev, { role: 'ai', text: reply }]);
      setShowComplaintForm(false);
      setComplaintText('');
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Не удалось отправить жалобу. Попробуйте позже.' },
      ]);
    } finally {
      setComplaintSending(false);
    }
  };

  const handleNewChat = () => {
    const next = archiveAndReset(STORAGE_KEY, WELCOME, { messages, sessionCount: 0, archives });
    setMessages(next.messages);
    setArchives(next.archives);
    setViewArchiveId(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[200] flex h-[min(560px,calc(100vh-6rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#122e41] shadow-2xl animate-in slide-in-from-bottom-5 duration-500 sm:bottom-10 sm:right-10 sm:w-[400px]">
        <div className="flex flex-none items-center justify-between border-b border-white/10 bg-[#0b2234] px-5 py-4">
          <div>
            <span className="mb-1 inline-block rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-yellow-400">
              Навигатор
            </span>
            <span className="block text-sm font-bold text-white">Умный город Тюмень</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowComplaintForm((v) => !v)}
              title="Сообщить об ошибке"
              className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-colors hover:border-red-400/30 hover:text-red-300"
            >
              Ошибка
            </button>
            <button type="button" onClick={onClose} className="text-2xl text-white/50 hover:text-white">
              &times;
            </button>
          </div>
        </div>

        {archives.length > 0 && (
          <div className="flex flex-none gap-2 overflow-x-auto border-b border-white/5 bg-[#0b2234]/60 px-3 py-2 scrollbar-hide">
            <button
              type="button"
              onClick={() => setViewArchiveId(null)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                !viewArchiveId ? 'bg-yellow-400/20 text-yellow-300' : 'bg-white/5 text-gray-500'
              }`}
            >
              Текущий
            </button>
            {archives.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setViewArchiveId(a.id)}
                className={`max-w-[120px] shrink-0 truncate rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                  viewArchiveId === a.id ? 'bg-yellow-400/20 text-yellow-300' : 'bg-white/5 text-gray-500'
                }`}
              >
                {a.title}
              </button>
            ))}
          </div>
        )}

        {!viewArchiveId && (
          <div className="flex flex-none flex-wrap gap-1.5 border-b border-white/5 bg-[#0b2234]/80 px-4 py-2">
            {CITY_QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={loading}
                onClick={() => handleSend(q)}
                className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-gray-400 transition-colors hover:bg-yellow-400/10 hover:text-yellow-300 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {showComplaintForm && !viewArchiveId && (
          <div className="animate-in fade-in flex-none border-b border-red-400/20 bg-red-950/30 p-4 duration-300">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-red-300">
              Жалоба об ошибке
            </p>
            <textarea
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              rows={2}
              placeholder="Опишите проблему..."
              className="mb-2 w-full resize-none rounded-xl border border-white/10 bg-[#122e41] px-3 py-2 text-xs text-white outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleComplaintSubmit}
                disabled={complaintSending || !complaintText.trim()}
                className="rounded-lg bg-red-500/80 px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-red-500 disabled:opacity-40"
              >
                {complaintSending ? 'Отправка...' : 'Отправить'}
              </button>
              <button
                type="button"
                onClick={() => setShowComplaintForm(false)}
                className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 hover:text-white"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#0f2536] p-5"
        >
          {displayedMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-yellow-500 font-medium text-black'
                    : 'bg-[#1a3a4d] text-white/95'
                }`}
              >
                {m.role === 'ai' ? parseAiLinks(m.text, { onLinkClick: handleLinkClick }) : m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-center text-xs text-white/30 animate-pulse">Ищу на сайте...</div>
          )}
        </div>

        <div className="flex-none border-t border-white/5 bg-[#0b2234] p-4">
          {viewArchiveId ? (
            <p className="text-center text-xs text-gray-500">
              Архивный диалог — только просмотр.{' '}
              <button type="button" className="text-yellow-400 underline" onClick={() => setViewArchiveId(null)}>
                Вернуться
              </button>
            </p>
          ) : (
            <>
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-yellow-400"
                >
                  Новый диалог
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  maxLength={400}
                  placeholder="Куда перейти? Что найти?"
                  className="flex-grow rounded-xl bg-[#122e41] px-4 py-3 text-sm text-white outline-none transition-all focus:ring-1 focus:ring-yellow-400/50"
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={loading}
                  className="rounded-xl bg-yellow-500 p-3 text-black transition-colors hover:bg-yellow-400"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedItem && (
        <InfoModal
          data={selectedItem as React.ComponentProps<typeof InfoModal>['data']}
          onClose={() => setSelectedItem(null)}
          onNavigate={(page) => {
            setSelectedItem(null);
            onClose();
            onNavigate(page);
          }}
        />
      )}
    </>
  );
};
