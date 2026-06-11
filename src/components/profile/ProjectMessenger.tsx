import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchMyChatProjects,
  fetchProjectMessages,
  sendProjectMessage,
  type ChatProjectOption,
  type ProjectChatMessage,
} from '../../services/projectChatService';

export const ProjectMessenger: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ChatProjectOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingProjects(true);
    fetchMyChatProjects(user.id)
      .then((list) => {
        setProjects(list);
        if (list.length > 0 && !selectedId) setSelectedId(list[0].project_id);
      })
      .catch(() => setError('Не удалось загрузить чаты'))
      .finally(() => setLoadingProjects(false));
  }, [user]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setError('');
    fetchProjectMessages(selectedId)
      .then(setMessages)
      .catch(() => setError('Не удалось загрузить сообщения'))
      .finally(() => setLoadingMessages(false));

    const timer = window.setInterval(() => {
      fetchProjectMessages(selectedId).then(setMessages).catch(() => undefined);
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedProject = projects.find((p) => p.project_id === selectedId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedId || !draft.trim()) return;

    setSending(true);
    setError('');
    const result = await sendProjectMessage(selectedId, user.id, draft);
    setSending(false);

    if (!result.ok) {
      setError(result.error || 'Не удалось отправить');
      return;
    }

    setDraft('');
    const updated = await fetchProjectMessages(selectedId);
    setMessages(updated);
  };

  if (loadingProjects) {
    return <p className="text-gray-400 text-sm">Загрузка чатов...</p>;
  }

  if (projects.length === 0) {
    return (
      <div className="bg-[#122e41] p-10 rounded-[32px] border border-white/5 text-center text-gray-400 space-y-2">
        <p>Чаты появятся, когда вы создадите проект или вас примут в команду.</p>
        <p className="text-xs text-gray-500">
          Автор проекта может связаться с участниками здесь и обменяться контактами для совместной работы.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 min-h-[420px]">
      <div className="bg-[#122e41] rounded-2xl border border-white/5 p-3 space-y-1 max-h-[420px] overflow-y-auto">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2 py-1">Проекты</p>
        {projects.map((p) => (
          <button
            key={p.project_id}
            type="button"
            onClick={() => setSelectedId(p.project_id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
              selectedId === p.project_id
                ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30'
                : 'text-gray-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="font-bold block truncate">{p.project_title}</span>
            <span className="text-[10px] uppercase text-gray-500">
              {p.role === 'owner' ? 'Мой проект' : 'Участник'}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-[#122e41] rounded-2xl border border-white/5 flex flex-col min-h-[420px]">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="font-bold text-white truncate">{selectedProject?.project_title}</h3>
          <p className="text-xs text-gray-500">
            Командный чат · контакты из профиля видны участникам
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingMessages ? (
            <p className="text-gray-500 text-sm">Загрузка...</p>
          ) : messages.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Напишите первое сообщение — договоритесь о созвоне или обменяйтесь контактами.
            </p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${isMine ? 'ml-auto items-end' : 'items-start'}`}
                >
                  {!isMine && (
                    <span className="text-[10px] text-yellow-400/80 font-bold mb-0.5 px-1">
                      {msg.sender_name}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      isMine
                        ? 'bg-yellow-400 text-black rounded-br-md'
                        : 'bg-white/10 text-gray-100 rounded-bl-md'
                    }`}
                  >
                    {msg.body}
                  </div>
                  {!isMine && msg.sender_contact && (
                    <p className="text-[10px] text-gray-500 mt-1 px-1 truncate max-w-full">
                      Контакты: {msg.sender_contact}
                    </p>
                  )}
                  <span className="text-[9px] text-gray-600 mt-0.5 px-1">
                    {new Date(msg.created_at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="px-4 text-xs text-rose-400 border-t border-white/5 pt-2">{error}</p>
        )}

        <form onSubmit={handleSend} className="p-3 border-t border-white/10 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Сообщение..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl text-sm"
          >
            {sending ? '...' : '→'}
          </button>
        </form>
      </div>
    </div>
  );
};
