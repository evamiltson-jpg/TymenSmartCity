import {
  decryptDirectMessage,
  decryptGroupMessage,
  encryptDirectMessage,
  encryptGroupMessage,
  importPublicKeyJwk,
  isE2eCipherPayload,
  isE2eGroupCipherPayload,
} from '../lib/crypto/crypto';
import { getPrivateKey, waitForEncryptionReady } from '../lib/crypto/keyManager';
import type { E2eCipherPayload, E2eGroupCipherPayload } from '../lib/crypto/types';
import { decryptMessage, messageCryptoScopes } from '../utils/messageCrypto';
import {
  fetchUserPublicKeys,
  hasUserPublicKey,
  prefetchUserPublicKeys,
  waitForUserPublicKey,
} from './publicKeyService';

export const E2E_BODY_PLACEHOLDER = '🔒';

const DECRYPT_FAILED = '[Не удалось расшифровать сообщение]';
const LEGACY_ENCRYPTED = '[Сообщение зашифровано. Настройте VITE_MESSAGE_ENCRYPTION_KEY для расшифровки.]';
const WAITING_KEYS = '[Ожидаем ключи шифрования у собеседника]';

export type ChatDecryptContext =
  | { kind: 'direct'; myUserId: string; peerId: string; senderId: string }
  | { kind: 'project'; myUserId: string; projectId: string; senderId: string; participantIds: string[] };

export type EncryptChatResult =
  | { ok: true; body: string; encrypted_data: E2eCipherPayload | E2eGroupCipherPayload }
  | { ok: false; error: string };

export const prepareChatEncryption = async (
  myUserId: string,
  peerOrParticipantIds: string[],
): Promise<{ ready: boolean; error?: string }> => {
  const keysReady = await waitForEncryptionReady(myUserId, 12_000);
  if (!keysReady) {
    return { ready: false, error: 'Ключи шифрования ещё создаются. Подождите пару секунд.' };
  }

  const ids = [...new Set(peerOrParticipantIds.filter((id) => id !== myUserId))];
  if (ids.length > 0) {
    await prefetchUserPublicKeys(ids);
  }

  return { ready: true };
};

export const canEncryptDirect = async (peerId: string): Promise<boolean> => {
  if (!getPrivateKey()) return false;
  return hasUserPublicKey(peerId);
};

export const canEncryptProject = async (participantIds: string[]): Promise<boolean> => {
  if (!getPrivateKey()) return false;
  const keys = await fetchUserPublicKeys(participantIds);
  return participantIds.every((id) => keys.has(id));
};

export const encryptDirectChatPayload = async (
  plaintext: string,
  myUserId: string,
  peerId: string,
): Promise<EncryptChatResult> => {
  const prepared = await prepareChatEncryption(myUserId, [peerId]);
  if (!prepared.ready) {
    return { ok: false, error: prepared.error || 'Шифрование не готово.' };
  }

  const privateKey = getPrivateKey();
  if (!privateKey) {
    return { ok: false, error: 'Не удалось загрузить ключи шифрования.' };
  }

  const hasPeerKey = await hasUserPublicKey(peerId);
  if (!hasPeerKey) {
    const appeared = await waitForUserPublicKey(peerId, 12_000, 1_500);
    if (!appeared) {
      return {
        ok: false,
        error: 'У собеседника ещё нет ключей. Попросите его войти в аккаунт — ключи создадутся автоматически.',
      };
    }
  }

  const peerJwk = (await fetchUserPublicKeys([peerId])).get(peerId);
  if (!peerJwk) {
    return { ok: false, error: 'Не удалось получить ключ собеседника.' };
  }

  const peerPublic = await importPublicKeyJwk(peerJwk);
  const encrypted_data = await encryptDirectMessage(plaintext, privateKey, peerPublic);
  return { ok: true, body: E2E_BODY_PLACEHOLDER, encrypted_data };
};

export const encryptProjectChatPayload = async (
  plaintext: string,
  myUserId: string,
  _projectId: string,
  participantIds: string[],
): Promise<EncryptChatResult> => {
  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.length === 0) uniqueIds.push(myUserId);

  const prepared = await prepareChatEncryption(myUserId, uniqueIds);
  if (!prepared.ready) {
    return { ok: false, error: prepared.error || 'Шифрование не готово.' };
  }

  const privateKey = getPrivateKey();
  if (!privateKey) {
    return { ok: false, error: 'Не удалось загрузить ключи шифрования.' };
  }

  const missing: string[] = [];
  let jwks = await fetchUserPublicKeys(uniqueIds);
  for (const id of uniqueIds) {
    if (!jwks.has(id)) missing.push(id);
  }

  if (missing.length > 0) {
    await Promise.all(missing.map((id) => waitForUserPublicKey(id, 8_000, 1_500)));
    jwks = await fetchUserPublicKeys(uniqueIds);
  }

  const stillMissing = uniqueIds.filter((id) => !jwks.has(id));
  if (stillMissing.length > 0) {
    return {
      ok: false,
      error: `Не у всех участников есть ключи (${stillMissing.length}). Им нужно один раз войти в аккаунт.`,
    };
  }

  const publicKeys = new Map<string, CryptoKey>();
  for (const [id, jwk] of jwks) {
    publicKeys.set(id, await importPublicKeyJwk(jwk));
  }

  const encrypted_data = await encryptGroupMessage(plaintext, privateKey, uniqueIds, publicKeys);
  return { ok: true, body: E2E_BODY_PLACEHOLDER, encrypted_data };
};

export const decryptChatBody = async (
  body: string,
  encryptedData: unknown,
  context: ChatDecryptContext,
): Promise<string> => {
  const privateKey = getPrivateKey();

  if (privateKey && isE2eGroupCipherPayload(encryptedData)) {
    try {
      const senderJwk = (await fetchUserPublicKeys([context.senderId])).get(context.senderId);
      if (!senderJwk) return WAITING_KEYS;
      const senderPublic = await importPublicKeyJwk(senderJwk);
      return await decryptGroupMessage(
        encryptedData,
        context.myUserId,
        privateKey,
        senderPublic,
      );
    } catch {
      return DECRYPT_FAILED;
    }
  }

  if (privateKey && isE2eCipherPayload(encryptedData)) {
    try {
      const otherId =
        context.kind === 'direct'
          ? context.senderId === context.myUserId
            ? context.peerId
            : context.senderId
          : context.senderId;
      const otherJwk = (await fetchUserPublicKeys([otherId])).get(otherId);
      if (!otherJwk) return WAITING_KEYS;
      const otherPublic = await importPublicKeyJwk(otherJwk);
      return await decryptDirectMessage(encryptedData, privateKey, otherPublic);
    } catch {
      return DECRYPT_FAILED;
    }
  }

  if (body === E2E_BODY_PLACEHOLDER) {
    return privateKey ? WAITING_KEYS : '[Зашифрованное сообщение — войдите с этого устройства]';
  }

  const scope =
    context.kind === 'direct'
      ? messageCryptoScopes.directChat(context.myUserId, context.peerId)
      : messageCryptoScopes.projectChat(context.projectId);

  const decrypted = await decryptMessage(body, scope);
  if (decrypted.includes('VITE_MESSAGE_ENCRYPTION_KEY')) {
    return LEGACY_ENCRYPTED;
  }
  return decrypted;
};

export const getPeerEncryptionStatus = async (
  peerId: string,
): Promise<'ready' | 'missing' | 'local-missing'> => {
  if (!getPrivateKey()) return 'local-missing';
  return (await hasUserPublicKey(peerId)) ? 'ready' : 'missing';
};
