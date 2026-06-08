-- Дополнительные колонки для расширенной формы проектов + модерация.
-- Выполните в Supabase SQL Editor.

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_direction TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_task TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS technologies JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS looking_for_team BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS needed_roles JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vacancy_note TEXT;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'На модерации';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_request_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_client_request_id
  ON public.projects (client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_published_at ON public.projects (published_at DESC);

-- Старые проекты без даты публикации считаем уже опубликованными
UPDATE public.projects
SET published_at = COALESCE(published_at, created_at, NOW()),
    moderation_status = COALESCE(moderation_status, 'Опубликован')
WHERE published_at IS NULL;
