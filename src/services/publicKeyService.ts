import { isSupabaseConfigured, supabase } from './supabase';
import { importPublicKeyJwk } from '../lib/crypto/crypto';

const publicKeyCache = new Map<string, JsonWebKey>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const invalidatePublicKeyCache = (userId?: string): void => {
  if (userId) {
    publicKeyCache.delete(userId);
    return;
  }
  publicKeyCache.clear();
};

export const upsertUserPublicKey = async (userId: string, publicKeyJson: string): Promise<void> => {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('user_public_keys').upsert(
    {
      user_id: userId,
      public_key: publicKeyJson,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) throw error;
  try {
    publicKeyCache.set(userId, JSON.parse(publicKeyJson) as JsonWebKey);
  } catch {
    // ignore invalid cache
  }
};

export const fetchUserPublicKeyJwk = async (userId: string): Promise<JsonWebKey | null> => {
  const cached = publicKeyCache.get(userId);
  if (cached) return cached;

  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('user_public_keys')
    .select('public_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.public_key) return null;

  try {
    const jwk = JSON.parse(data.public_key) as JsonWebKey;
    publicKeyCache.set(userId, jwk);
    return jwk;
  } catch {
    return null;
  }
};

export const fetchUserPublicKeys = async (
  userIds: string[],
): Promise<Map<string, JsonWebKey>> => {
  const result = new Map<string, JsonWebKey>();
  const missing: string[] = [];

  for (const id of userIds) {
    const cached = publicKeyCache.get(id);
    if (cached) {
      result.set(id, cached);
    } else {
      missing.push(id);
    }
  }

  if (missing.length === 0 || !isSupabaseConfigured) return result;

  const { data, error } = await supabase
    .from('user_public_keys')
    .select('user_id, public_key')
    .in('user_id', missing);

  if (error) return result;

  for (const row of data || []) {
    try {
      const jwk = JSON.parse(row.public_key as string) as JsonWebKey;
      publicKeyCache.set(row.user_id as string, jwk);
      result.set(row.user_id as string, jwk);
    } catch {
      // skip invalid row
    }
  }

  return result;
};

export const importCachedPublicKey = async (userId: string): Promise<CryptoKey | null> => {
  const jwk = await fetchUserPublicKeyJwk(userId);
  if (!jwk) return null;
  return importPublicKeyJwk(jwk);
};

export const clearPublicKeyCache = (): void => {
  publicKeyCache.clear();
};

export const hasUserPublicKey = async (userId: string): Promise<boolean> =>
  Boolean(await fetchUserPublicKeyJwk(userId));

/** Ожидание публикации ключа пользователя (например, собеседник только что вошёл). */
export const waitForUserPublicKey = async (
  userId: string,
  timeoutMs = 20_000,
  intervalMs = 2_000,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    invalidatePublicKeyCache(userId);
    if (await hasUserPublicKey(userId)) return true;
    await sleep(intervalMs);
  }
  return false;
};

export const prefetchUserPublicKeys = async (userIds: string[]): Promise<void> => {
  if (userIds.length === 0) return;
  await fetchUserPublicKeys([...new Set(userIds)]);
};
