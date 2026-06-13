import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  clearEncryptionSession,
  ensureUserEncryptionKeys,
  getEncryptionState,
  regenerateUserEncryptionKeys,
} from '../lib/crypto/keyManager';
import type { EncryptionKeyState } from '../lib/crypto/types';
import { getPeerEncryptionStatus, prepareChatEncryption } from '../services/chatEncryptionService';
import { clearPublicKeyCache } from '../services/publicKeyService';
import { useAuth } from './AuthContext';

type PeerKeyStatus = 'ready' | 'missing' | 'local-missing' | 'unknown';

interface EncryptionContextType extends EncryptionKeyState {
  initializing: boolean;
  initError: string | null;
  warmChatKeys: (peerOrParticipantIds: string[]) => Promise<void>;
  resetKeysOnDevice: () => Promise<void>;
  peerStatus: (peerId: string) => Promise<PeerKeyStatus>;
}

const EncryptionContext = createContext<EncryptionContextType | null>(null);

const initWithRetry = async (userId: string, attempts = 3): Promise<EncryptionKeyState> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await ensureUserEncryptionKeys(userId);
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastError;
};

export const EncryptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [state, setState] = useState<EncryptionKeyState>({
    ready: false,
    fingerprint: null,
    publicKeyJwk: null,
  });
  const userIdRef = useRef<string | null>(null);

  const runKeyInit = useCallback(async (userId: string) => {
    setInitializing(true);
    setInitError(null);
    try {
      const next = await initWithRetry(userId);
      setState(next);
    } catch (err) {
      console.error('E2E key init failed:', err);
      setInitError('Не удалось создать ключи шифрования. Проверьте интернет и обновите страницу.');
      setState(getEncryptionState());
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      userIdRef.current = null;
      clearEncryptionSession();
      clearPublicKeyCache();
      setState({ ready: false, fingerprint: null, publicKeyJwk: null });
      setInitError(null);
      return;
    }

    userIdRef.current = user.id;
    void runKeyInit(user.id);
  }, [isAuthenticated, user?.id, runKeyInit]);

  useEffect(() => {
    if (!user) return;

    const resync = () => {
      if (document.visibilityState === 'visible' && userIdRef.current) {
        void ensureUserEncryptionKeys(userIdRef.current)
          .then(setState)
          .catch(() => undefined);
      }
    };

    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', resync);
    const timer = window.setInterval(() => {
      if (userIdRef.current) {
        void ensureUserEncryptionKeys(userIdRef.current)
          .then(setState)
          .catch(() => undefined);
      }
    }, 5 * 60_000);

    return () => {
      window.removeEventListener('focus', resync);
      document.removeEventListener('visibilitychange', resync);
      window.clearInterval(timer);
    };
  }, [user?.id]);

  const warmChatKeys = useCallback(
    async (peerOrParticipantIds: string[]) => {
      if (!user) return;
      await prepareChatEncryption(user.id, peerOrParticipantIds).catch(() => undefined);
    },
    [user],
  );

  const resetKeysOnDevice = useCallback(async () => {
    if (!user) return;
    setInitializing(true);
    setInitError(null);
    try {
      clearPublicKeyCache();
      const next = await regenerateUserEncryptionKeys(user.id);
      setState(next);
    } catch (err) {
      console.error('E2E key reset failed:', err);
      setInitError('Не удалось пересоздать ключи.');
    } finally {
      setInitializing(false);
    }
  }, [user]);

  const peerStatus = useCallback(async (peerId: string): Promise<PeerKeyStatus> => {
    return getPeerEncryptionStatus(peerId);
  }, []);

  return (
    <EncryptionContext.Provider
      value={{
        ...state,
        initializing,
        initError,
        warmChatKeys,
        resetKeysOnDevice,
        peerStatus,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  );
};

export const useEncryption = (): EncryptionContextType => {
  const ctx = useContext(EncryptionContext);
  if (!ctx) {
    throw new Error('useEncryption must be used within EncryptionProvider');
  }
  return ctx;
};
