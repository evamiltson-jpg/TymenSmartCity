import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEncryption } from '../../contexts/EncryptionContext';
import {
  downloadChatFile,
  isImageMime,
  openChatImage,
  uploadDirectChatFile,
  uploadProjectChatFile,
  validateChatFile,
} from '../../services/chatFileService';
import {
  fetchChatUnreadSummary,
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
  type ChatUnreadSummary,
  type ChatProjectOption,
  type DirectChatOption,
  type DirectMessage,
  type MessengerSelection,
  type ProjectChatMessage,
  type ProjectChatParticipant,
} from '../../services/projectChatService';
import { messageCryptoScopes } from '../../utils/messageCrypto';
import { validateChatMessage } from '../../utils/security';

type AttachmentFields = {
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
};

const ChatAttachmentLink: React.FC<{
  attachment: AttachmentFields;
  scope: string;
}> = ({ attachment, scope }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!attachment.attachment_path || !isImageMime(attachment.attachment_mime)) return;
    let cancelled = false;
    setLoading(true);
    openChatImage(
      attachment.attachment_path,
      scope,
      attachment.attachment_mime || 'image/jpeg',
    )
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.attachment_path, attachment.attachment_mime, scope]);

  if (!attachment.attachment_path || !attachment.attachment_name) return null;

  const handleDownload = () => {
    void downloadChatFile(
      attachment.attachment_path!,
      scope,
      attachment.attachment_name!,
      attachment.attachment_mime || 'application/octet-stream',
    ).catch(() => undefined);
  };

  if (isImageMime(attachment.attachment_mime)) {
    return (
      <div className="mt-2 space-y-1">
        {loading && <p className="text-[10px] text-gray-500">Загрузка...</p>}
        {previewUrl && (
          <button type="button" onClick={handleDownload} className="block max-w-full">
            <img
              src={previewUrl}
              alt={attachment.attachment_name}
              className="max-h-40 rounded-lg border border-white/10"
            />
          </button>
        )}
        {!previewUrl && !loading && (
          <button
            type="button"
            onClick={handleDownload}
            className="text-xs underline text-sky-300"
          >
            📎 {attachment.attachment_name}
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="mt-2 text-xs underline text-sky-300 block text-left"
    >
      📎 {attachment.attachment_name}
    </button>
  );
};

export const ProjectMessenger: React.FC<{
  onUnreadChange?: (total: number) => void;
}> = ({ onUnreadChange }) => {
  const { user } = useAuth();
  const {
    ready: e2eReady,
    fingerprint,
    initializing: e2eInit,
    initError: e2eError,
    warmChatKeys,
    resetKeysOnDevice,
    peerStatus,
  } = useEncryption();
  const [peerKeyState, setPeerKeyState] = useState<
    'ready' | 'missing' | 'local-missing' | 'unknown'
  >('unknown');
  const [projects, setProjects] = useState<ChatProjectOption[]>([]);
  const [directChats, setDirectChats] = useState<DirectChatOption[]>([]);
  const [unread, setUnread] = useState<ChatUnreadSummary>({ total: 0, projects: {}, direct: {} });
  const [selection, setSelection] = useState<MessengerSelection | null>(null);
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [participants, setParticipants] = useState<ProjectChatParticipant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openChat = (next: MessengerSelection) => {
    setSelection(next);
    setMobileShowChat(true);
  };

  const backToChatList = () => {
    setMobileShowChat(false);
    setShowParticipants(false);
  };

  const reloadLists = async () => {
    if (!user) return;
    const [projList, dmList, unreadSummary] = await Promise.all([
      fetchMyChatProjects(user.id),
      fetchDirectChats(user.id),
      fetchChatUnreadSummary(user.id),
    ]);
    setProjects(projList);
    setDirectChats(dmList);
    setUnread(unreadSummary);
    onUnreadChange?.(unreadSummary.total);
    return { projList, dmList };
  };

  useEffect(() => {
    if (!selection || selection.kind !== 'direct') {
      setPeerKeyState('unknown');
      return;
    }

    let cancelled = false;
    const poll = async () => {
      const status = await peerStatus(selection.peerId);
      if (!cancelled) setPeerKeyState(status);
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 3_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selection, peerStatus, e2eReady]);

  useEffect(() => {
    if (!selection || !user || e2eInit) return;

    const ids =
      selection.kind === 'direct'
        ? [selection.peerId]
        : participants.map((p) => p.user_id);

    if (ids.length === 0 && selection.kind === 'project') return;

    void warmChatKeys(ids);
  }, [selection, user, participants, e2eInit, warmChatKeys]);

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
        setMobileShowChat(false);
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
          fetchProjectMessages(selection.projectId, user.id),
          fetchProjectParticipants(selection.projectId),
        ]);
        setMessages(msgs);
        setDirectMessages([]);
        setParticipants(parts);
        const summary = await fetchChatUnreadSummary(user.id);
        setUnread(summary);
        onUnreadChange?.(summary.total);
      } else {
        const msgs = await fetchDirectMessages(user.id, selection.peerId);
        setDirectMessages(msgs);
        setMessages([]);
        setParticipants([]);
        const summary = await fetchChatUnreadSummary(user.id);
        setUnread(summary);
        onUnreadChange?.(summary.total);
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

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validation = validateChatFile(file);
    if (!validation.ok) {
      setError(validation.error || 'Недопустимый файл');
      return;
    }
    setPendingFile(file);
    setError('');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selection) return;
    if (e2eInit) {
      setError('Ключи шифрования ещё создаются. Подождите пару секунд.');
      return;
    }
    if (!e2eReady) {
      setError(e2eError || 'Шифрование недоступно. Обновите страницу.');
      return;
    }
    if (!draft.trim() && !pendingFile) return;

    let textValue = '';
    if (draft.trim()) {
      const validation = validateChatMessage(draft);
      if (!validation.ok) {
        setError(validation.error || 'Недопустимое сообщение');
        return;
      }
      textValue = validation.value;
    }

    setSending(true);
    setError('');

    let attachment;
    if (pendingFile) {
      const uploadResult =
        selection.kind === 'project'
          ? await uploadProjectChatFile(selection.projectId, user.id, pendingFile)
          : await uploadDirectChatFile(user.id, selection.peerId, pendingFile);
      if (!uploadResult.ok || !uploadResult.attachment) {
        setSending(false);
        setError(uploadResult.error || 'Не удалось загрузить файл');
        return;
      }
      attachment = uploadResult.attachment;
    }

    let result: { ok: boolean; error?: string };
    if (selection.kind === 'project') {
      result = await sendProjectMessage(selection.projectId, user.id, textValue, attachment);
      if (result.ok) {
        setMessages(await fetchProjectMessages(selection.projectId, user.id));
        await reloadLists();
      }
    } else {
      result = await sendDirectMessage(user.id, selection.peerId, textValue, attachment);
      if (result.ok) {
        setDirectMessages(await fetchDirectMessages(user.id, selection.peerId));
        await reloadLists();
      }
    }

    setSending(false);
    if (!result.ok) {
      setError(result.error || 'Не удалось отправить');
      return;
    }
    setDraft('');
    setPendingFile(null);
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
    setMobileShowChat(false);
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

    openChat({ kind: 'direct', peerId });
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
    <div className="space-y-4">
      <div className="messenger-panel grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_1fr] gap-3 lg:gap-4 min-h-0">
      <div
        className={`messenger-sidebar custom-scrollbar bg-[#122e41] rounded-2xl border border-white/5 p-3 space-y-3 overflow-y-auto min-h-0 flex flex-col ${
          mobileShowChat ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <p className="lg:hidden text-sm font-bold text-white px-2 pb-1">Чаты</p>
        {projects.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2 py-1">
              Проекты
            </p>
            {projects.map((p) => {
              const unreadCount = unread.projects[p.project_id] || 0;
              return (
              <button
                key={p.project_id}
                type="button"
                onClick={() => openChat({ kind: 'project', projectId: p.project_id })}
                className={`w-full text-left px-3 py-3 rounded-xl text-sm transition-colors active:scale-[0.99] ${
                  selection?.kind === 'project' && selection.projectId === p.project_id
                    ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30'
                    : 'text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="font-bold block truncate flex items-center gap-2">
                  <span className="truncate">{p.project_title}</span>
                  {unreadCount > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] uppercase text-gray-500">
                  {p.role === 'owner' ? 'Мой проект' : 'Участник'}
                </span>
              </button>
            );
            })}
          </div>
        )}

        {directChats.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2 py-1">
              Личные
            </p>
            {directChats.map((c) => {
              const unreadCount = unread.direct[c.peer_id] || 0;
              return (
              <button
                key={c.peer_id}
                type="button"
                onClick={() => openChat({ kind: 'direct', peerId: c.peer_id })}
                className={`w-full text-left px-3 py-3 rounded-xl text-sm transition-colors active:scale-[0.99] ${
                  selection?.kind === 'direct' && selection.peerId === c.peer_id
                    ? 'bg-sky-400/15 text-sky-300 border border-sky-400/30'
                    : 'text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="font-bold block truncate flex items-center gap-2">
                  <span className="truncate">{c.peer_name}</span>
                  {unreadCount > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                {c.last_message && (
                  <span className="text-[10px] text-gray-500 block truncate">{c.last_message}</span>
                )}
              </button>
            );
            })}
          </div>
        )}
      </div>

      <div
        className={`messenger-chat bg-[#122e41] rounded-2xl border border-white/5 flex-col min-h-0 overflow-hidden ${
          mobileShowChat ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <div className="flex-none px-3 sm:px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={backToChatList}
              className="lg:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-gray-300 hover:bg-white/5"
              aria-label="Назад к списку чатов"
            >
              ←
            </button>
            <div className="min-w-0">
              <h3 className="font-bold text-white truncate text-sm sm:text-base">
                {headerTitle || 'Выберите чат'}
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                {selection?.kind === 'project'
                  ? 'Командный чат'
                  : selection?.kind === 'direct'
                    ? 'Личные сообщения'
                    : '—'}
              </p>
            </div>
          </div>
          {selection && (
            <div className="flex shrink-0 gap-1.5 sm:gap-2">
              {selection.kind === 'project' && (
                <button
                  type="button"
                  onClick={() => setShowParticipants((v) => !v)}
                  className="px-2 sm:px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-lg border border-white/10 text-gray-300 hover:bg-white/5"
                >
                  <span className="hidden sm:inline">Участники ({participants.length})</span>
                  <span className="sm:hidden">👥 {participants.length}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleHideChat()}
                className="px-2 sm:px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                title="Скрыть чат из списка"
              >
                <span className="hidden sm:inline">Скрыть</span>
                <span className="sm:hidden">✕</span>
              </button>
            </div>
          )}
        </div>

        {selection && (
          <div className="flex-none px-3 sm:px-4 py-2 border-b border-white/5 bg-[#0f2433]/80 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs">
            {e2eInit ? (
              <span className="text-gray-400">Создаём ключи шифрования…</span>
            ) : e2eReady ? (
              <>
                <span className="text-emerald-400 font-medium">🔐 E2E — ключи активны</span>
                {fingerprint && (
                  <span className="text-gray-500 font-mono" title="Отпечаток вашего ключа">
                    {fingerprint}
                  </span>
                )}
              </>
            ) : (
              <span className="text-amber-400">{e2eError || 'Шифрование недоступно'}</span>
            )}
            {selection.kind === 'direct' && peerKeyState === 'missing' && (
              <span className="text-amber-400">· Ожидаем ключи собеседника (войдёт — появятся сами)</span>
            )}
            {selection.kind === 'direct' && peerKeyState === 'ready' && (
              <span className="text-emerald-400/80">· Собеседник готов к E2E</span>
            )}
            <details className="ml-auto">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-400 list-none">
                Устройство
              </summary>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Пересоздать ключи на этом устройстве? Старые E2E-сообщения могут не расшифроваться.',
                    )
                  ) {
                    void resetKeysOnDevice();
                  }
                }}
                className="mt-1 block text-rose-400 hover:text-rose-300 underline text-left"
              >
                Пересоздать ключи (новое устройство)
              </button>
            </details>
          </div>
        )}

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
          className="custom-scrollbar flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 overscroll-contain"
        >
          {!selection ? (
            <p className="text-gray-500 text-sm text-center py-8">Выберите чат из списка</p>
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
                    className={`flex flex-col max-w-[92%] sm:max-w-[85%] ${isMine ? 'ml-auto items-end' : 'items-start'}`}
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
                      {msg.attachment_path && (
                        <ChatAttachmentLink
                          attachment={msg}
                          scope={messageCryptoScopes.projectChat(selection.projectId)}
                        />
                      )}
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
                  className={`flex flex-col max-w-[92%] sm:max-w-[85%] ${isMine ? 'ml-auto items-end' : 'items-start'}`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      isMine
                        ? 'bg-sky-400 text-black rounded-br-md'
                        : 'bg-white/10 text-gray-100 rounded-bl-md'
                    }`}
                  >
                    {msg.body}
                    {msg.attachment_path && user && (
                      <ChatAttachmentLink
                        attachment={msg}
                        scope={messageCryptoScopes.directChat(user.id, selection.peerId)}
                      />
                    )}
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
            className="messenger-compose flex-none p-2 sm:p-3 border-t border-white/10 space-y-2"
          >
            {pendingFile && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
                <span className="truncate">📎 {pendingFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-rose-400 font-bold shrink-0"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleFilePick}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-50"
                title="Прикрепить JPG, PNG, WebP или PDF (до 5 МБ)"
              >
                📎
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Сообщение..."
                className="messenger-input flex-1 min-w-0 px-3 sm:px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400"
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={sending || (!draft.trim() && !pendingFile)}
                className="shrink-0 w-11 h-11 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold rounded-xl text-sm"
              >
                {sending ? '...' : '→'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </div>
  );
};
