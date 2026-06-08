-- Индексы и storage для быстрой работы проектов (безопасный повторный запуск).

CREATE INDEX IF NOT EXISTS idx_projects_site_rating
  ON public.projects (is_on_site, moderation_status, rating DESC, votes DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_author_created
  ON public.projects (created_by, created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-images', 'project-images', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Project images are publicly accessible" ON storage.objects;
CREATE POLICY "Project images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Users can upload their own project images" ON storage.objects;
CREATE POLICY "Users can upload their own project images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update their own project images" ON storage.objects;
CREATE POLICY "Users can update their own project images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete their own project images" ON storage.objects;
CREATE POLICY "Users can delete their own project images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

GRANT USAGE ON SCHEMA storage TO authenticated, anon;
