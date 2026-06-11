import {
  decryptDirectMessage,
  decryptGroupMessage,
  encryptDirectMessage,
  encryptGroupMessage,
  importPublicKeyJwk,
  isE2eCipherPayload,
  isE2eGroupCipherPayload,
} from '../lib/crypto/crypto';
import { getPrivateKey } from '../lib/crypto/keyManager';
import type { E2eCipherPayload, E2eGroupCipherPayload } from '../lib/crypto/types';
import {
  decryptMessage,
  encryptMessage,
  messageCryptoScopes,
} from '../utils/messageCrypto';
import { fetchUserPublicKeys, hasUserPublicKey } from './publicKeyService';

export const E2E_BODY_PLACEHOLDER = '🔒';

const DECRYPT_FAILED = '[Не удалось расшифровать сообщение]';
const LEGACY_ENCRYPTED = '[Сообщение зашифровано. Настройте VITE_MESSAGE_ENCRYPTION_KEY для расшифровки.]';
const WAITING_KEYS = '[Ожидаем ключи шифрования у собеседника]';

export type ChatDecryptContext =
  | { kind: 'direct'; myUserId: string; peerId: string; senderId: string }
  | { kind: 'project'; myUserId: string; projectId: string; senderId: string; participantIds: string[] };

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
): Promise<{ body: string; encrypted_data: E2eCipherPayload | null }> => {
  const scope = messageCryptoScopes.directChat(myUserId, peerId);
  const privateKey = getPrivateKey();

  if (privateKey) {
    const peerKeys = await fetchUserPublicKeys([peerId]);
    const peerJwk = peerKeys.get(peerId);
    if (peerJwk) {
      const peerPublic = await importPublicKeyJwk(peerJwk);
      const encrypted_data = await encryptDirectMessage(plaintext, privateKey, peerPublic);
      return { body: E2E_BODY_PLACEHOLDER, encrypted_data };
    }
  }

  return {
    body: await encryptMessage(plaintext, scope),
    encrypted_data: null,
  };
};

export const encryptProjectChatPayload = async (
  plaintext: string,
  myUserId: string,
  projectId: string,
  participantIds: string[],
): Promise<{ body: string; encrypted_data: E2eGroupCipherPayload | null }> => {
  const scope = messageCryptoScopes.projectChat(projectId);
  const privateKey = getPrivateKey();
  const uniqueIds = [...new Set(participantIds)];

  if (privateKey && uniqueIds.length > 0) {
    const jwks = await fetchUserPublicKeys(uniqueIds);
    if (uniqueIds.every((id) => jwks.has(id))) {
      const publicKeys = new Map<string, CryptoKey>();
      for (const [id, jwk] of jwks) {
        publicKeys.set(id, await importPublicKeyJwk(jwk));
      }
      const encrypted_data = await encryptGroupMessage(plaintext, privateKey, uniqueIds, publicKeys);
      return { body: E2E_BODY_PLACEHOLDER, encrypted_data };
    }
  }

  return {
    body: await encryptMessage(plaintext, scope),
    encrypted_data: null,
  };
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
