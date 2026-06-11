import { base64ToBytes, bytesToBase64 } from './encoding';
import type { E2eCipherPayload, E2eGroupCipherPayload } from './types';

const ECDH_PARAMS: EcKeyImportParams = { name: 'ECDH', namedCurve: 'P-256' };

export const generateEcdhKeyPair = (): Promise<CryptoKeyPair> =>
  crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey']);

export const exportPublicKeyJwk = (publicKey: CryptoKey): Promise<JsonWebKey> =>
  crypto.subtle.exportKey('jwk', publicKey);

export const exportPrivateKeyJwk = (privateKey: CryptoKey): Promise<JsonWebKey> =>
  crypto.subtle.exportKey('jwk', privateKey);

export const importPublicKeyJwk = (jwk: JsonWebKey): Promise<CryptoKey> =>
  crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, []);

export const importPrivateKeyJwk = (jwk: JsonWebKey): Promise<CryptoKey> =>
  crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, ['deriveKey']);

const deriveAesGcmKey = (privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> =>
  crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

const encryptBuffer = async (aesKey: CryptoKey, data: ArrayBuffer): Promise<E2eCipherPayload> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, data);
  return {
    v: 1,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertext)),
  };
};

const decryptBuffer = async (aesKey: CryptoKey, payload: E2eCipherPayload): Promise<ArrayBuffer> => {
  const iv = base64ToBytes(payload.iv);
  const data = base64ToBytes(payload.data);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, data);
};

const encryptTextWithKey = async (plaintext: string, aesKey: CryptoKey): Promise<E2eCipherPayload> => {
  const encoded = new TextEncoder().encode(plaintext);
  return encryptBuffer(aesKey, encoded.buffer);
};

const decryptTextWithKey = async (payload: E2eCipherPayload, aesKey: CryptoKey): Promise<string> => {
  const decrypted = await decryptBuffer(aesKey, payload);
  return new TextDecoder().decode(decrypted);
};

export const encryptDirectMessage = async (
  plaintext: string,
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<E2eCipherPayload> => {
  const aesKey = await deriveAesGcmKey(myPrivateKey, peerPublicKey);
  return encryptTextWithKey(plaintext, aesKey);
};

export const decryptDirectMessage = async (
  payload: E2eCipherPayload,
  myPrivateKey: CryptoKey,
  otherPublicKey: CryptoKey,
): Promise<string> => {
  const aesKey = await deriveAesGcmKey(myPrivateKey, otherPublicKey);
  return decryptTextWithKey(payload, aesKey);
};

export const encryptGroupMessage = async (
  plaintext: string,
  myPrivateKey: CryptoKey,
  recipientUserIds: string[],
  publicKeysByUser: Map<string, CryptoKey>,
): Promise<E2eGroupCipherPayload> => {
  const contentKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const rawKey = await crypto.subtle.exportKey('raw', contentKey);
  const messagePayload = await encryptTextWithKey(plaintext, contentKey);

  const keys: Record<string, E2eCipherPayload> = {};
  for (const userId of recipientUserIds) {
    const pub = publicKeysByUser.get(userId);
    if (!pub) continue;
    const wrapKey = await deriveAesGcmKey(myPrivateKey, pub);
    keys[userId] = await encryptBuffer(wrapKey, rawKey);
  }

  return {
    v: 1,
    iv: messagePayload.iv,
    data: messagePayload.data,
    keys,
  };
};

export const decryptGroupMessage = async (
  payload: E2eGroupCipherPayload,
  myUserId: string,
  myPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey,
): Promise<string> => {
  const wrapped = payload.keys?.[myUserId];
  if (!wrapped) {
    throw new Error('missing wrapped key');
  }
  const wrapKey = await deriveAesGcmKey(myPrivateKey, senderPublicKey);
  const rawKeyBuf = await decryptBuffer(wrapKey, wrapped);
  const contentKey = await crypto.subtle.importKey(
    'raw',
    rawKeyBuf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  return decryptTextWithKey({ v: 1, iv: payload.iv, data: payload.data }, contentKey);
};

export const isE2eCipherPayload = (value: unknown): value is E2eCipherPayload =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as E2eCipherPayload).v === 1 &&
      typeof (value as E2eCipherPayload).iv === 'string' &&
      typeof (value as E2eCipherPayload).data === 'string',
  );

export const isE2eGroupCipherPayload = (value: unknown): value is E2eGroupCipherPayload =>
  isE2eCipherPayload(value) &&
  typeof (value as E2eGroupCipherPayload).keys === 'object' &&
  (value as E2eGroupCipherPayload).keys !== null;
