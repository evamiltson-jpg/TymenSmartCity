-- LK-only workspace: timeline, черновики Проши, доп. поля (не влияют на публичную карточку)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS workspace_data jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.projects.workspace_data IS
  'Данные личного кабинета: timeline, заметки ассистента. Не отображаются на публичной странице проекта.';
