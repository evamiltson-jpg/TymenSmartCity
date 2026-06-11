import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearEncryptionSession,
  ensureUserEncryptionKeys,
  getEncryptionState,
  regenerateUserEncryptionKeys,
} from '../lib/crypto/keyManager';
import type { EncryptionKeyState } from '../lib/crypto/types';
import { clearPublicKeyCache } from '../services/publicKeyService';
import { getPeerEncryptionStatus } from '../services/chatEncryptionService';
import { useAuth } from './AuthContext';

type PeerKeyStatus = 'ready' | 'missing' | 'local-missing' | 'unknown';

interface EncryptionContextType extends EncryptionKeyState {
  initializing: boolean;
  refreshKeys: () => Promise<void>;
  peerStatus: (peerId: string) => Promise<PeerKeyStatus>;
}

const EncryptionContext = createContext<EncryptionContextType | null>(null);

export const EncryptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [initializing, setInitializing] = useState(false);
  const [state, setState] = useState<EncryptionKeyState>({
    ready: false,
    fingerprint: null,
    publicKeyJwk: null,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearEncryptionSession();
      clearPublicKeyCache();
      setState({ ready: false, fingerprint: null, publicKeyJwk: null });
      return;
    }

    let cancelled = false;
    setInitializing(true);
    ensureUserEncryptionKeys(user.id)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch((err) => {
        console.error('E2E key init failed:', err);
        if (!cancelled) setState(getEncryptionState());
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const refreshKeys = useCallback(async () => {
    if (!user) return;
    setInitializing(true);
    try {
      clearPublicKeyCache();
      const next = await regenerateUserEncryptionKeys(user.id);
      setState(next);
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
        refreshKeys,
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
