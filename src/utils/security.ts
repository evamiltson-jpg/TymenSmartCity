/** Базовые проверки безопасности пользовательского ввода */

const PHONE_PATTERNS = [
  /\+?\d[\d\s().-]{8,}\d/,
  /\b8\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/,
  /\b\+7[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/,
];

const DANGEROUS_SNIPPETS = [
  /<script\b/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:text\/html/i,
];

export const containsPhoneNumber = (text: string): boolean => {
  const normalized = text.replace(/\s/g, '');
  if (normalized.length < 10) return false;
  return PHONE_PATTERNS.some((pattern) => pattern.test(text));
};

export const validateContactInfo = (text: string): { ok: boolean; error?: string } => {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true };
  if (containsPhoneNumber(trimmed)) {
    return {
      ok: false,
      error: 'Не указывайте номер телефона в контактах — используйте Telegram, Discord или VK.',
    };
  }
  if (trimmed.length > 300) {
    return { ok: false, error: 'Контакты слишком длинные (максимум 300 символов).' };
  }
  return { ok: true };
};

export const sanitizeChatInput = (text: string, maxLength = 1000): string => {
  return text
    .replace(/\0/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .slice(0, maxLength);
};

export const validateChatMessage = (
  text: string,
  maxLength = 1000,
): { ok: boolean; error?: string; value: string } => {
  const value = sanitizeChatInput(text, maxLength);
  if (!value) {
    return { ok: false, error: 'Введите сообщение.', value };
  }
  if (DANGEROUS_SNIPPETS.some((pattern) => pattern.test(value))) {
    return { ok: false, error: 'Сообщение содержит недопустимые фрагменты.', value };
  }
  if (containsPhoneNumber(value)) {
    return {
      ok: false,
      error: 'Не отправляйте номер телефона в чате. Укажите ник в Telegram или другой мессенджер.',
      value,
    };
  }
  return { ok: true, value };
};

export const validateApplicationMessage = (
  text: string,
): { ok: boolean; error?: string; value: string } => {
  const value = sanitizeChatInput(text, 500);
  if (containsPhoneNumber(value)) {
    return {
      ok: false,
      error: 'Не указывайте номер телефона в заявке. Используйте контакты из профиля.',
      value,
    };
  }
  if (DANGEROUS_SNIPPETS.some((pattern) => pattern.test(value))) {
    return { ok: false, error: 'Текст заявки содержит недопустимые фрагменты.', value };
  }
  return { ok: true, value };
};
