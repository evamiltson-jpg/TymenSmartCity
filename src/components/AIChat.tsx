import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { InfoModal } from './InfoModal';
import {
  AiHistoryMessage,
  buildCityContext,
  CITY_QUICK_PROMPTS,
  sendAiMessage,
  submitComplaint,
} from '../services/aiService';
import { parseAiLinks } from '../utils/parseAiLinks';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export const AIChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Привет! Я ИИ-консультант портала «Умный город Тюмень».\n\nПомогу:\n• найти городские сервисы (ЖКХ, медицина, транспорт)\n• подобрать ИТ-проект или команду\n• ответить на мелкие вопросы по сайту\n• принять жалобу об ошибке\n\nВыберите подсказку ниже или напишите свой вопрос.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [complaintSending, setComplaintSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cityContextRef = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, showComplaintForm]);

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

  const handleLinkClick = async ({
    type,
    id,
    label,
  }: {
    type: string;
    id: string;
    label: string;
  }) => {
    const table = type === 'проект' ? 'projects' : 'services';
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();

    if (error || !data) {
      alert('Ошибка: карточка не найдена в базе (возможно, удалена).');
      return;
    }

    setSelectedItem({
      title: data.title,
      desc: data.description,
      category: data.category,
      image: data.image_url,
      isService: type !== 'проект',
      buttonText: type === 'проект' ? 'Подать заявку' : data.button_text || 'Перейти к сервису',
      status: type === 'проект' ? data.status : undefined,
    });
  };

  const handleSend = async (overrideText?: string) => {
    const userMsg = (overrideText ?? input).trim();
    if (!userMsg || loading) return;

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
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Ошибка соединения с сервером. Проверьте, что Edge Function ai-chat развёрнута в Supabase.',
        },
      ]);
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[200] flex h-[min(600px,calc(100vh-6rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#122e41] shadow-2xl animate-in slide-in-from-bottom-5 duration-500 sm:bottom-10 sm:right-10 sm:h-[min(600px,calc(100vh-6rem))] sm:w-[400px] sm:resize sm:resize-both">
        <div className="flex flex-none items-center justify-between border-b border-white/10 bg-[#0b2234] p-5">
          <div className="flex items-center space-x-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-white">Тюмень.Ассистент</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowComplaintForm((v) => !v)}
              title="Сообщить об ошибке"
              className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-colors hover:border-red-400/30 hover:text-red-300"
            >
              🐛
            </button>
            <button onClick={onClose} className="text-2xl text-white/50 hover:text-white">
              &times;
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-white/5 bg-[#0b2234]/80 px-4 py-2">
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

        {showComplaintForm && (
          <div className="animate-in fade-in border-b border-red-400/20 bg-red-950/30 p-4 duration-300">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-red-300">
              Жалоба об ошибке
            </p>
            <textarea
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              rows={3}
              placeholder="Опишите, что не работает..."
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

        <div ref={scrollRef} className="custom-scrollbar flex-grow space-y-6 overflow-y-auto bg-[#0f2536] p-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed shadow-md ${
                  m.role === 'user' ? 'bg-yellow-500 font-medium text-black' : 'bg-[#1a3a4d] text-white'
                }`}
              >
                {m.role === 'ai' ? parseAiLinks(m.text, { onLinkClick: handleLinkClick }) : m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="animate-pulse text-center text-xs text-white/30">Поиск информации...</div>
          )}
        </div>

        <div className="border-t border-white/5 bg-[#0b2234] p-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              maxLength={500}
              placeholder="Например: как записать ребёнка в школу?"
              className="flex-grow rounded-xl bg-[#122e41] px-4 py-3 text-sm text-white outline-none transition-all focus:ring-1 focus:ring-yellow-400/50"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading}
              className="rounded-xl bg-yellow-500 p-3 text-black transition-colors hover:bg-yellow-400"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {selectedItem && <InfoModal data={selectedItem} onClose={() => setSelectedItem(null)} />}
    </>
  );
};
