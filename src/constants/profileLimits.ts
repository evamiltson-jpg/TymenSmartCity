export const PROFILE_FILE_LIMITS = {
  avatar: {
    maxBytes: 2 * 1024 * 1024,
    label: '2 МБ',
    accept: 'image/jpeg,image/png,image/webp,image/gif',
  },
  certificate: {
    maxBytes: 5 * 1024 * 1024,
    label: '5 МБ',
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
  },
} as const;

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

export const validateProfileFile = (
  file: File,
  kind: keyof typeof PROFILE_FILE_LIMITS,
): { ok: true } | { ok: false; error: string } => {
  const limit = PROFILE_FILE_LIMITS[kind];

  if (file.size > limit.maxBytes) {
    return {
      ok: false,
      error: `Файл слишком большой (${formatFileSize(file.size)}). Максимум: ${limit.label}.`,
    };
  }

  if (kind === 'avatar' && !file.type.startsWith('image/')) {
    return { ok: false, error: 'Аватар должен быть изображением (JPG, PNG, WebP, GIF).' };
  }

  if (kind === 'certificate') {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      return { ok: false, error: 'Допустимы только JPG, PNG, WebP или PDF.' };
    }
  }

  return { ok: true };
};
