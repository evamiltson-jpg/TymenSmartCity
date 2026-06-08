-- Диагностика единой таблицы projects

SELECT
  moderation_status,
  is_on_site,
  COUNT(*) AS cnt
FROM projects
GROUP BY moderation_status, is_on_site
ORDER BY moderation_status, is_on_site;

SELECT id, title, moderation_status, is_on_site, is_showcase, created_by, published_at
FROM projects
ORDER BY created_at DESC
LIMIT 20;

-- Проекты, видимые на сайте (портфолио и поиск)
SELECT id, title, category, moderation_status, is_on_site
FROM projects
WHERE is_on_site = true AND moderation_status = 'Принят'
ORDER BY created_at DESC;

-- Автопубликация просроченных модераций
SELECT public.promote_due_projects();
