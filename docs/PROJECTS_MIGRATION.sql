-- Только миграция для проектов (если остальная БД уже настроена).
-- Выполните этот файл в Supabase SQL Editor.

-- В Supabase имя "projects" часто занято VIEW (представлением), а не таблицей.
-- Удаляем view, чтобы создать настоящую таблицу для сохранения проектов.
DROP VIEW IF EXISTS public.projects CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.projects CASCADE;

-- =============================================================================
-- Таблица projects
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  problem TEXT,
  description TEXT NOT NULL,
  expected_result TEXT,
  direction VARCHAR(100),
  custom_direction TEXT,
  task VARCHAR(100),
  custom_task TEXT,
  economic_effect NUMERIC,
  technologies JSONB NOT NULL DEFAULT '[]'::JSONB,
  looking_for_team BOOLEAN NOT NULL DEFAULT false,
  needed_roles JSONB NOT NULL DEFAULT '[]'::JSONB,
  vacancy_note TEXT,
  note TEXT,
  category VARCHAR(255),
  author_name VARCHAR(255),
  co_authors JSONB NOT NULL DEFAULT '[]'::JSONB,
  participation_share INTEGER NOT NULL DEFAULT 100 CHECK (participation_share >= 0 AND participation_share <= 100),
  ready_to_implement BOOLEAN NOT NULL DEFAULT false,
  already_implemented BOOLEAN NOT NULL DEFAULT false,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_name VARCHAR(255),
  rating_enabled BOOLEAN NOT NULL DEFAULT true,
  image_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'В работе',
  votes INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем колонки только если projects уже была таблицей (не view)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'projects' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS problem TEXT;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS expected_result TEXT;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS direction VARCHAR(100);
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_direction TEXT;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS task VARCHAR(100);
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_task TEXT;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS technologies JSONB NOT NULL DEFAULT '[]'::JSONB;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS looking_for_team BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS needed_roles JSONB NOT NULL DEFAULT '[]'::JSONB;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vacancy_note TEXT;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS economic_effect NUMERIC;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS note TEXT;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS co_authors JSONB NOT NULL DEFAULT '[]'::JSONB;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS participation_share INTEGER NOT NULL DEFAULT 100;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ready_to_implement BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS already_implemented BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS rating_enabled BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_rating_enabled ON projects(rating_enabled);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read projects" ON projects;
CREATE POLICY "Anyone can read projects" ON projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authors can update their projects" ON projects;
CREATE POLICY "Authors can update their projects" ON projects
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their projects" ON projects;
CREATE POLICY "Authors can delete their projects" ON projects
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

GRANT SELECT ON projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Storage: обложки проектов
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'project-images',
    'project-images',
    true,
    3145728,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Project images are publicly accessible" ON storage.objects;
CREATE POLICY "Project images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Users can upload their own project images" ON storage.objects;
CREATE POLICY "Users can upload their own project images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update their own project images" ON storage.objects;
CREATE POLICY "Users can update their own project images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete their own project images" ON storage.objects;
CREATE POLICY "Users can delete their own project images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
