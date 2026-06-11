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

const setCache = async (userId: string, privateKey: CryptoKey, publicKeyJwk: JsonWebKey) => {
  cachedUserId = userId;
  cachedPrivateKey = privateKey;
  cachedPublicKeyJwk = publicKeyJwk;
  cachedFingerprint = await fingerprintPublicKey(publicKeyJwk);
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
    return getEncryptionState();
  }

  const stored = await loadStoredPrivateKey(userId);
  if (stored?.jwk) {
    const privateKey = await importPrivateKeyJwk(stored.jwk);
    const publicKeyJwk: JsonWebKey = { ...stored.jwk };
    delete publicKeyJwk.d;
    publicKeyJwk.key_ops = [];
    await setCache(userId, privateKey, publicKeyJwk);
    await upsertUserPublicKey(userId, JSON.stringify(publicKeyJwk)).catch(() => undefined);
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
  await upsertUserPublicKey(userId, JSON.stringify(publicJwk));
  await setCache(userId, keyPair.privateKey, publicJwk);

  return getEncryptionState();
};

export const regenerateUserEncryptionKeys = async (userId: string): Promise<EncryptionKeyState> => {
  clearEncryptionSession();
  await deleteStoredPrivateKey(userId);
  return ensureUserEncryptionKeys(userId);
};
