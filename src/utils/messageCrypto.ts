/**
 * Шифрование текста сообщений перед сохранением в Supabase (AES-256-GCM).
 * Аналог «облачных» чатов: в БД хранится только шифротекст, расшифровка в браузете участников.
 * Для полного E2E (Secret Chats) нужен обмен ключами между устройствами — здесь защита at-rest + TLS.
 */

const ENC_PREFIX = 'enc:v1:';
const PBKDF2_ITERATIONS = 120_000;

const getMasterSecret = (): string | null => {
  const raw = import.meta.env.VITE_MESSAGE_ENCRYPTION_KEY?.trim();
  return raw || null;
};

export const isMessageEncryptionEnabled = (): boolean => Boolean(getMasterSecret());

const masterKeyBytes = async (): Promise<ArrayBuffer | null> => {
  const secret = getMasterSecret();
  if (!secret) return null;

  try {
    const binary = atob(secret);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    if (bytes.length >= 32) {
      return bytes.slice(0, 32).buffer;
    }
  } catch {
    // not base64 — derive from passphrase below
  }

  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
};

const deriveAesKey = async (scope: string): Promise<CryptoKey | null> => {
  const master = await masterKeyBytes();
  if (!master) return null;

  const keyMaterial = await crypto.subtle.importKey('raw', master, 'PBKDF2', false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(`tyumen-smart-city:${scope}`),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const messageCryptoScopes = {
  projectChat: (projectId: string) => `project-chat:${projectId}`,
  directChat: (userId: string, peerId: string) => {
    const [a, b] = [userId, peerId].sort();
    return `direct-chat:${a}:${b}`;
  },
  application: (projectId: string, userId: string) =>
    `application:${projectId || 'title'}:${userId}`,
};

export const encryptMessage = async (plaintext: string, scope: string): Promise<string> => {
  const trimmed = plaintext.trim();
  if (!trimmed) return trimmed;

  const key = await deriveAesKey(scope);
  if (!key) return trimmed;

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(trimmed);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const payload = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  payload.set(iv);
  payload.set(new Uint8Array(ciphertext), iv.length);

  return `${ENC_PREFIX}${bytesToBase64(payload)}`;
};

export const decryptMessage = async (payload: string, scope: string): Promise<string> => {
  if (!payload || !payload.startsWith(ENC_PREFIX)) {
    return payload;
  }

  const key = await deriveAesKey(scope);
  if (!key) {
    return '[Сообщение зашифровано. Настройте VITE_MESSAGE_ENCRYPTION_KEY для расшифровки.]';
  }

  try {
    const combined = base64ToBytes(payload.slice(ENC_PREFIX.length));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[Не удалось расшифровать сообщение]';
  }
};

export const decryptMessageField = async (
  value: string | null | undefined,
  scope: string,
): Promise<string | null> => {
  if (value == null || value === '') return value ?? null;
  return decryptMessage(value, scope);
};
