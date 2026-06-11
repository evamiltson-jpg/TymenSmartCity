import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchDirectChats,
  fetchDirectMessages,
  fetchMyChatProjects,
  fetchProjectMessages,
  fetchProjectParticipants,
  hideDirectChat,
  hideProjectChat,
  sendDirectMessage,
  sendProjectMessage,
  unhideDirectChat,
  type ChatProjectOption,
  type DirectChatOption,
  type DirectMessage,
  type MessengerSelection,
  type ProjectChatMessage,
  type ProjectChatParticipant,
} from '../../services/projectChatService';

export const ProjectMessenger: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ChatProjectOption[]>([]);
  const [directChats, setDirectChats] = useState<DirectChatOption[]>([]);
  const [selection, setSelection] = useState<MessengerSelection | null>(null);
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [participants, setParticipants] = useState<ProjectChatParticipant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const reloadLists = async () => {
    if (!user) return;
    const [projList, dmList] = await Promise.all([
      fetchMyChatProjects(user.id),
      fetchDirectChats(user.id),
    ]);
    setProjects(projList);
    setDirectChats(dmList);
    return { projList, dmList };
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    reloadLists()
      .then(({ projList, dmList } = { projList: [], dmList: [] }) => {
        if (projList.length > 0) {
          setSelection({ kind: 'project', projectId: projList[0].project_id });
        } else if (dmList.length > 0) {
          setSelection({ kind: 'direct', peerId: dmList[0].peer_id });
        }
      })
      .catch(() => setError('Не удалось загрузить чаты'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selection || !user) {
      setMessages([]);
      setDirectMessages([]);
      setParticipants([]);
      return;
    }

    setLoadingMessages(true);
    setError('');
    setShowParticipants(false);

    const load = async () => {
      if (selection.kind === 'project') {
        const [msgs, parts] = await Promise.all([
          fetchProjectMessages(selection.projectId),
          fetchProjectParticipants(selection.projectId),
        ]);
        setMessages(msgs);
        setDirectMessages([]);
        setParticipants(parts);
      } else {
        const msgs = await fetchDirectMessages(user.id, selection.peerId);
        setDirectMessages(msgs);
        setMessages([]);
        setParticipants([]);
      }
    };

    load()
      .catch(() => setError('Не удалось загрузить сообщения'))
      .finally(() => setLoadingMessages(false));

    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [selection, user]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, directMessages, loadingMessages]);

  const selectedProject =
    selection?.kind === 'project'
      ? projects.find((p) => p.project_id === selection.projectId)
      : null;

  const selectedDirect =
    selection?.kind === 'direct'
      ? directChats.find((c) => c.peer_id === selection.peerId)
      : null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selection || !draft.trim()) return;

    setSending(true);
    setError('');

    let result: { ok: boolean; error?: string };
    if (selection.kind === 'project') {
      result = await sendProjectMessage(selection.projectId, user.id, draft);
      if (result.ok) {
        setMessages(await fetchProjectMessages(selection.projectId));
      }
    } else {
      result = await sendDirectMessage(user.id, selection.peerId, draft);
      if (result.ok) {
        setDirectMessages(await fetchDirectMessages(user.id, selection.peerId));
        const dmList = await fetchDirectChats(user.id);
        setDirectChats(dmList);
      }
    }

    setSending(false);
    if (!result.ok) {
      setError(result.error || 'Не удалось отправить');
      return;
    }
    setDraft('');
  };

  const handleHideChat = async () => {
    if (!user || !selection) return;
    if (!confirm('Скрыть этот чат из списка? История сохранится.')) return;

    if (selection.kind === 'project') {
      const result = await hideProjectChat(user.id, selection.projectId);
      if (!result.ok) {
        setError(result.error || 'Не удалось скрыть');
        return;
      }
    } else {
      const result = await hideDirectChat(user.id, selection.peerId);
      if (!result.ok) {
        setError(result.error || 'Не удалось скрыть');
        return;
      }
    }

    const { projList, dmList } = await reloadLists();
    if (projList.length > 0) {
      setSelection({ kind: 'project', projectId: projList[0].project_id });
    } else if (dmList.length > 0) {
      setSelection({ kind: 'direct', peerId: dmList[0].peer_id });
    } else {
      setSelection(null);
    }
  };

  const handleStartDirect = async (peerId: string, peerName?: string) => {
    if (!user || peerId === user.id) return;
    await unhideDirectChat(user.id, peerId);

    setDirectChats((prev) => {
      if (prev.some((c) => c.peer_id === peerId)) return prev;
      return [{ peer_id: peerId, peer_name: peerName || 'Участник' }, ...prev];
    });

    setSelection({ kind: 'direct', peerId });
    setShowParticipants(false);
  };

  if (loading) {
    return <p className="text-gray-400 text-sm">Загрузка чатов...</p>;
  }

  if (projects.length === 0 && directChats.length === 0) {
    return (
      <div className="bg-[#122e41] p-10 rounded-[32px] border border-white/5 text-center text-gray-400 space-y-2">
        <p>Чаты появятся, когда вы создадите проект или вас примут в команду.</p>
        <p className="text-xs text-gray-500">
          Здесь можно общаться в командном чате и писать личные сообщения участникам.
        </p>
      </div>
    );
  }

  const headerTitle =
    selection?.kind === 'project'
      ? selectedProject?.project_title
      : selectedDirect?.peer_name || 'Личные сообщения';

  return (
    <div className="messenger-panel grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 min-h-0">
      <div className="messenger-sidebar custom-scrollbar bg-[#122e41] rounded-2xl border border-white/5 p-3 space-y-3 overflow-y-auto min-h-0">
        {projects.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2 py-1">
              Проекты
            </p>
            {projects.map((p) => (
              <button
                key={p.project_id}
                type="button"
                onClick={() => setSelection({ kind: 'project', projectId: p.project_id })}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  selection?.kind === 'project' && selection.projectId === p.project_id
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
        )}

        {directChats.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2 py-1">
              Личные
            </p>
            {directChats.map((c) => (
              <button
                key={c.peer_id}
                type="button"
                onClick={() => setSelection({ kind: 'direct', peerId: c.peer_id })}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  selection?.kind === 'direct' && selection.peerId === c.peer_id
                    ? 'bg-sky-400/15 text-sky-300 border border-sky-400/30'
                    : 'text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="font-bold block truncate">{c.peer_name}</span>
                {c.last_message && (
                  <span className="text-[10px] text-gray-500 block truncate">{c.last_message}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="messenger-chat bg-[#122e41] rounded-2xl border border-white/5 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-none px-4 py-3 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-white truncate">{headerTitle || 'Выберите чат'}</h3>
            <p className="text-xs text-gray-500 truncate">
              {selection?.kind === 'project'
                ? 'Командный чат проекта'
                : selection?.kind === 'direct'
                  ? 'Личная переписка'
                  : '—'}
            </p>
          </div>
          {selection && (
            <div className="flex shrink-0 gap-2">
              {selection.kind === 'project' && (
                <button
                  type="button"
                  onClick={() => setShowParticipants((v) => !v)}
                  className="px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-lg border border-white/10 text-gray-300 hover:bg-white/5"
                >
                  Участники ({participants.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleHideChat()}
                className="px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                title="Скрыть чат из списка"
              >
                Скрыть
              </button>
            </div>
          )}
        </div>

        {showParticipants && selection?.kind === 'project' && (
          <div className="flex-none border-b border-white/10 px-4 py-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {participants.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="text-white font-semibold">{p.name}</span>
                  <span className="text-[10px] text-gray-500 ml-2 uppercase">
                    {p.role === 'owner' ? 'автор' : 'участник'}
                  </span>
                  {p.contact_info && (
                    <p className="text-[10px] text-gray-500 truncate">{p.contact_info}</p>
                  )}
                </div>
                {user && p.user_id !== user.id && (
                  <button
                    type="button"
                    onClick={() => void handleStartDirect(p.user_id, p.name)}
                    className="shrink-0 text-[10px] font-bold text-sky-400 hover:text-sky-300 uppercase"
                  >
                    Написать
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          ref={scrollRef}
          className="custom-scrollbar flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
        >
          {!selection ? (
            <p className="text-gray-500 text-sm text-center py-8">Выберите чат слева</p>
          ) : loadingMessages ? (
            <p className="text-gray-500 text-sm">Загрузка...</p>
          ) : selection.kind === 'project' ? (
            messages.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Напишите первое сообщение команде.
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
                        {msg.sender_contact}
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
            )
          ) : directMessages.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Начните личную переписку.</p>
          ) : (
            directMessages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${isMine ? 'ml-auto items-end' : 'items-start'}`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      isMine
                        ? 'bg-sky-400 text-black rounded-br-md'
                        : 'bg-white/10 text-gray-100 rounded-bl-md'
                    }`}
                  >
                    {msg.body}
                  </div>
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
        </div>

        {error && (
          <p className="flex-none px-4 text-xs text-rose-400 border-t border-white/5 pt-2">{error}</p>
        )}

        {selection && (
          <form
            onSubmit={handleSend}
            className="flex-none p-3 border-t border-white/10 flex gap-2"
          >
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
        )}
      </div>
    </div>
  );
};
