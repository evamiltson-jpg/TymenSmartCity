import React from 'react';
import { isMessageEncryptionEnabled } from '../../utils/messageCrypto';

export const ChatSecurityNotice: React.FC = () => {
  const encrypted = isMessageEncryptionEnabled();

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-100/90 leading-relaxed flex gap-3">
      <span className="text-base shrink-0" aria-hidden>
        {encrypted ? '🔒' : '⚠️'}
      </span>
      <div>
        <p className="font-bold text-emerald-300 mb-1">
          {encrypted ? 'Защищённый чат' : 'Режим без шифрования'}
        </p>
        {encrypted ? (
          <p>
            Сообщения шифруются в браузере (AES-256-GCM) перед отправкой в базу. Передача идёт по
            HTTPS. В БД хранится только шифротекст — как в облачных чатах Telegram. Не отправляйте
            номера телефонов и пароли.
          </p>
        ) : (
          <p>
            Добавьте <code className="text-emerald-200">VITE_MESSAGE_ENCRYPTION_KEY</code> в{' '}
            <code className="text-emerald-200">.env.local</code> для шифрования сообщений (см.{' '}
            <code className="text-emerald-200">.env.example</code>).
          </p>
        )}
      </div>
    </div>
  );
};
