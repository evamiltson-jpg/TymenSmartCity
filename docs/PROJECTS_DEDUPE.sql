-- Удаление дубликатов проектов (оставляет самую раннюю запись).
-- Выполните ОДИН раз в Supabase SQL Editor, если проекты продублировались.

DELETE FROM public.projects p1
USING public.projects p2
WHERE p1.title = p2.title
  AND p1.created_by = p2.created_by
  AND p1.created_at > p2.created_at;
