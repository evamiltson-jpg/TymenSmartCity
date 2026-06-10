import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  '';

// Legacy JWT anon key — обязателен для Edge Functions (verify_jwt).
// Publishable (sb_publishable_*) для ai-chat не подходит: 401 Invalid JWT.
const supabaseAnonJwt =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseKey =
  supabaseAnonJwt ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const getSupabaseAnonJwt = () => supabaseAnonJwt;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const READ_TIMEOUT_MS = 20_000;
const WRITE_TIMEOUT_MS = 60_000;

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const method = (init?.method || 'GET').toUpperCase();
  const timeoutMs = method === 'GET' || method === 'HEAD' ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Запрос занял слишком много времени');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase: задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY (или NEXT_PUBLIC_* аналоги) в .env.local',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
