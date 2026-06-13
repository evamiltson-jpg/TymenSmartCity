import {
  exportPrivateKeyJwk,
  exportPublicKeyJwk,
  generateEcdhKeyPair,
  importPrivateKeyJwk,
} from './crypto';
import { fingerprintPublicKey } from './encoding';
import { deleteStoredPrivateKey, loadStoredPrivateKey, saveStoredPrivateKey } from './keyStorage';
import type { EncryptionKeyState } from './types';
import { upsertUserPublicKey } from '../../services/publicKeyService';

let cachedUserId: string | null = null;
let cachedPrivateKey: CryptoKey | null = null;
let cachedPublicKeyJwk: JsonWebKey | null = null;
let cachedFingerprint: string | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const setCache = async (userId: string, privateKey: CryptoKey, publicKeyJwk: JsonWebKey) => {
  cachedUserId = userId;
  cachedPrivateKey = privateKey;
  cachedPublicKeyJwk = publicKeyJwk;
  cachedFingerprint = await fingerprintPublicKey(publicKeyJwk);
};

const syncPublicKeyWithRetry = async (userId: string, publicKeyJson: string): Promise<void> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await upsertUserPublicKey(userId, publicKeyJson);
      return;
    } catch (err) {
      lastError = err;
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastError;
};

export const clearEncryptionSession = (): void => {
  cachedUserId = null;
  cachedPrivateKey = null;
  cachedPublicKeyJwk = null;
  cachedFingerprint = null;
};

export const getPrivateKey = (): CryptoKey | null => cachedPrivateKey;

export const getEncryptionState = (): EncryptionKeyState => ({
  ready: Boolean(cachedPrivateKey),
  fingerprint: cachedFingerprint,
  publicKeyJwk: cachedPublicKeyJwk,
});

export const ensureUserEncryptionKeys = async (userId: string): Promise<EncryptionKeyState> => {
  if (cachedUserId === userId && cachedPrivateKey) {
    if (cachedPublicKeyJwk) {
      await syncPublicKeyWithRetry(userId, JSON.stringify(cachedPublicKeyJwk)).catch(() => undefined);
    }
    return getEncryptionState();
  }

  const stored = await loadStoredPrivateKey(userId);
  if (stored?.jwk) {
    const privateKey = await importPrivateKeyJwk(stored.jwk);
    const publicKeyJwk: JsonWebKey = { ...stored.jwk };
    delete publicKeyJwk.d;
    publicKeyJwk.key_ops = [];
    await setCache(userId, privateKey, publicKeyJwk);
    await syncPublicKeyWithRetry(userId, JSON.stringify(publicKeyJwk));
    return getEncryptionState();
  }

  const keyPair = await generateEcdhKeyPair();
  const privateJwk = await exportPrivateKeyJwk(keyPair.privateKey);
  const publicJwk = await exportPublicKeyJwk(keyPair.publicKey);

  await saveStoredPrivateKey({
    userId,
    jwk: privateJwk,
    createdAt: new Date().toISOString(),
  });
  await syncPublicKeyWithRetry(userId, JSON.stringify(publicJwk));
  await setCache(userId, keyPair.privateKey, publicJwk);

  return getEncryptionState();
};

/** Дождаться готовности ключей (например, перед отправкой сообщения). */
export const waitForEncryptionReady = async (
  userId: string,
  timeoutMs = 15_000,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const state = await ensureUserEncryptionKeys(userId);
      if (state.ready && getPrivateKey()) return true;
    } catch {
      // retry
    }
    await sleep(400);
  }
  return Boolean(getPrivateKey() && cachedUserId === userId);
};

export const regenerateUserEncryptionKeys = async (userId: string): Promise<EncryptionKeyState> => {
  clearEncryptionSession();
  await deleteStoredPrivateKey(userId);
  return ensureUserEncryptionKeys(userId);
};
