/** URL для ссылок из писем Supabase (сброс пароля, подтверждение email). */
export const getAuthRedirectUrl = () => {
  const base = import.meta.env.BASE_URL || '/';
  const origin = window.location.origin;

  if (!base || base === '/' || base === './') {
    return `${origin}/`;
  }

  const normalized = base.startsWith('/') ? base : `/${base}`;
  return `${origin}${normalized.endsWith('/') ? normalized : `${normalized}/`}`;
};

export const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();
