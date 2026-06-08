-- Единая таблица projects: статус модерации + видимость на сайте.
-- Выполните в Supabase SQL Editor после PROJECTS_MIGRATION.sql и PROJECTS_COLUMNS_PATCH.sql

-- 1. Новые поля
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_on_site BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_showcase BOOLEAN NOT NULL DEFAULT false;

-- Примеры с витрины могут быть без автора
ALTER TABLE public.projects ALTER COLUMN created_by DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_on_site ON public.projects (is_on_site, moderation_status);

-- 2. Нормализация старых статусов
UPDATE public.projects
SET moderation_status = 'Принят',
    is_on_site = true
WHERE moderation_status IN ('Опубликован', 'published')
   OR (moderation_status = 'На модерации' AND published_at IS NOT NULL AND published_at <= NOW());

UPDATE public.projects
SET moderation_status = 'На модерации',
    is_on_site = false
WHERE moderation_status IS NULL;

-- 3. Примеры на сайт (напрямую в projects, public_projects не нужна)
INSERT INTO public.projects (
  title, description, category, image_url, status, team_name, author_name,
  moderation_status, is_on_site, is_showcase, votes, published_at, rating_enabled
)
SELECT
  seed.title, seed.description, seed.category, seed.image_url, seed.status,
  'Smart City Tyumen', 'Платформа', 'Принят', true, true, seed.votes, NOW(), false
FROM (
  VALUES
    ('Умный город 2030', 'Проект по внедрению IoT-технологий для оптимизации уличного освещения, контроля загрязнения воздуха и управления трафиком', 'Города и урбанизм', 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=500&h=300&fit=crop', 'В разработке', 12),
    ('Зелёный Тюмень', 'Инициатива по озеленению города: посадка деревьев, создание новых парков и скверов, улучшение городской среды', 'Экология', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&h=300&fit=crop', 'В разработке', 8),
    ('Школа цифровой грамотности', 'Обучающий проект для пенсионеров и людей старшего возраста навыкам работы с компьютером и интернетом', 'Образование', 'https://images.unsplash.com/photo-1516534775068-bb57e39c1a29?w=500&h=300&fit=crop', 'В разработке', 6),
    ('Молодёжный центр инноваций', 'Хаб для стартапов и инновационных проектов молодёжи с менторством и финансированием', 'Предпринимательство', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop', 'В разработке', 15),
    ('Безопасный транспорт', 'Проект по внедрению систем безопасности в общественном транспорте и на дорогах города', 'Безопасность', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&h=300&fit=crop', 'В разработке', 10),
    ('Культурный мост', 'Программа обмена культурными инициативами с городами-побратимами в России и за рубежом', 'Культура', 'https://images.unsplash.com/photo-1577720643272-265f434e3f41?w=500&h=300&fit=crop', 'Внедрён', 7),
    ('Здоровый образ жизни', 'Кампания по пропаганде спорта, правильного питания и здоровья среди молодёжи', 'Здоровье', 'https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?w=500&h=300&fit=crop', 'В разработке', 9),
    ('Чистая вода', 'Научный проект по мониторингу качества воды в реках и водоёмах Тюменской области', 'Экология', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=500&h=300&fit=crop', 'В разработке', 5),
    ('Волонтёрская сеть', 'Платформа для организации волонтёрской деятельности и помощи нуждающимся жителям города', 'Социальная ответственность', 'https://images.unsplash.com/photo-1559028615-cd4628902d4a?w=500&h=300&fit=crop', 'В разработке', 20),
    ('Цифровое наследие', 'Проект по сохранению цифровой истории города: архивы фото, видео и документы о развитии Тюмени', 'История', 'https://images.unsplash.com/photo-1507842072343-583f20270319?w=500&h=300&fit=crop', 'В разработке', 4)
) AS seed(title, description, category, image_url, status, votes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.is_showcase = true AND lower(p.title) = lower(seed.title)
);

-- 4. Автопубликация после модерации (~1 час)
CREATE OR REPLACE FUNCTION public.promote_due_projects()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.projects
  SET
    moderation_status = 'Принят',
    is_on_site = true,
    updated_at = NOW()
  WHERE moderation_status = 'На модерации'
    AND is_on_site = false
    AND published_at IS NOT NULL
    AND published_at <= NOW();
$$;

GRANT EXECUTE ON FUNCTION public.promote_due_projects() TO anon, authenticated;

-- 5. RLS: на сайте только принятые и видимые; автор видит все свои
-- IF EXISTS — скрипт можно запускать повторно без ошибки 42710
DROP POLICY IF EXISTS "Anyone can read projects" ON public.projects;
DROP POLICY IF EXISTS "Read on-site or own projects" ON public.projects;

CREATE POLICY "Read on-site or own projects" ON public.projects
  FOR SELECT
  USING (
    (is_on_site = true AND moderation_status = 'Принят')
    OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
  );

-- Таблица public_projects больше не используется приложением (можно не создавать).
