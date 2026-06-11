import React, { useMemo } from 'react';
import { isMessageEncryptionEnabled } from '../../utils/messageCrypto';
import { isSupabaseConfigured } from '../../services/supabase';

const CheckItem: React.FC<{ ok: boolean; label: string; hint?: string }> = ({
  ok,
  label,
  hint,
}) => (
  <li className="flex gap-2 items-start">
    <span className={ok ? 'text-emerald-400' : 'text-amber-400'} aria-hidden>
      {ok ? '✓' : '○'}
    </span>
    <span>
      <span className={ok ? 'text-emerald-100' : 'text-gray-300'}>{label}</span>
      {hint && <span className="block text-gray-500 mt-0.5">{hint}</span>}
    </span>
  </li>
);

export const ChatSecurityNotice: React.FC = () => {
  const encrypted = isMessageEncryptionEnabled();
  const checks = useMemo(() => {
    const https =
      typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
    return {
      https,
      supabase: isSupabaseConfigured,
      encryption: encrypted,
    };
  }, [encrypted]);

  const allOk = checks.https && checks.supabase && checks.encryption;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-xs leading-relaxed flex gap-3 ${
        allOk
          ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-100/90'
          : 'border-amber-500/25 bg-amber-500/5 text-amber-100/90'
      }`}
    >
      <span className="text-base shrink-0" aria-hidden>
        {allOk ? '🔒' : '⚠️'}
      </span>
      <div className="space-y-2 min-w-0">
        <p className={`font-bold ${allOk ? 'text-emerald-300' : 'text-amber-300'}`}>
          {allOk ? 'Защищённый чат' : 'Проверьте безопасность'}
        </p>
        <ul className="space-y-1.5">
          <CheckItem
            ok={checks.https}
            label="HTTPS — защищённое соединение"
            hint={
              checks.https
                ? undefined
                : 'Открывайте сайт только по https://, не по http://'
            }
          />
          <CheckItem
            ok={checks.supabase}
            label="Supabase подключён"
            hint={checks.supabase ? undefined : 'Проверьте VITE_SUPABASE_URL и ключ в .env.local'}
          />
          <CheckItem
            ok={checks.encryption}
            label="Шифрование сообщений и файлов (AES-256-GCM)"
            hint={
              checks.encryption
                ? `Ключ загружен${typeof window !== 'undefined' && window.location.hostname.includes('github.io') ? ' (GitHub Pages)' : ' (локально)'}.`
                : typeof window !== 'undefined' && window.location.hostname.includes('github.io')
                  ? 'На GitHub Pages: секрет VITE_MESSAGE_ENCRYPTION_KEY в Actions + Run workflow «Deploy to GitHub Pages» + Ctrl+F5. Supabase Secrets не используются.'
                  : 'Добавьте VITE_MESSAGE_ENCRYPTION_KEY в .env.local, перезапустите npm run dev. Supabase Secrets для чата не нужны.'
            }
          />
        </ul>
        <p className="text-gray-400 pt-1">
          В БД хранится шифротекст; расшифровка в браузере участников. Это защита at-rest + TLS,
          не полный E2E как Secret Chats в Telegram. Не отправляйте пароли и номера телефонов.
        </p>
      </div>
    </div>
  );
};
