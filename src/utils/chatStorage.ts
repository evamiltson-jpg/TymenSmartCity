export interface StoredChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export interface ChatArchive {
  id: string;
  title: string;
  messages: StoredChatMessage[];
  sessionCount: number;
  savedAt: string;
}

export interface ActiveChatState {
  messages: StoredChatMessage[];
  sessionCount: number;
  archives: ChatArchive[];
}

const makeId = () => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function loadChatState(storageKey: string, welcome: StoredChatMessage): ActiveChatState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { messages: [welcome], sessionCount: 0, archives: [] };
    }
    const parsed = JSON.parse(raw) as Partial<ActiveChatState>;
    return {
      messages: parsed.messages?.length ? parsed.messages : [welcome],
      sessionCount: parsed.sessionCount ?? 0,
      archives: parsed.archives ?? [],
    };
  } catch {
    return { messages: [welcome], sessionCount: 0, archives: [] };
  }
}

export function saveChatState(storageKey: string, state: ActiveChatState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function archiveAndReset(
  storageKey: string,
  welcome: StoredChatMessage,
  current: ActiveChatState,
): ActiveChatState {
  const hasUserMessages = current.messages.some((m) => m.role === 'user');
  const archives = [...current.archives];

  if (hasUserMessages) {
    const firstUser = current.messages.find((m) => m.role === 'user');
    archives.unshift({
      id: makeId(),
      title: firstUser?.text.slice(0, 48) || 'Диалог',
      messages: current.messages,
      sessionCount: current.sessionCount,
      savedAt: new Date().toISOString(),
    });
  }

  const next: ActiveChatState = {
    messages: [welcome],
    sessionCount: 0,
    archives: archives.slice(0, 12),
  };
  saveChatState(storageKey, next);
  return next;
}

export function deleteArchive(
  storageKey: string,
  archiveId: string,
  current: ActiveChatState,
): ActiveChatState {
  const next: ActiveChatState = {
    ...current,
    archives: current.archives.filter((a) => a.id !== archiveId),
  };
  saveChatState(storageKey, next);
  return next;
}
