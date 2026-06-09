-- project_id: UUID -> TEXT (демо-проекты имеют числовые id)
-- + права SELECT/INSERT для authenticated

ALTER TABLE user_applications
  ALTER COLUMN project_id TYPE TEXT USING project_id::text;

ALTER TABLE user_applications
  ALTER COLUMN project_id DROP NOT NULL;

GRANT SELECT, INSERT, DELETE ON user_applications TO authenticated;
GRANT ALL ON user_applications TO service_role;

CREATE INDEX IF NOT EXISTS idx_user_applications_user_title
  ON user_applications (user_id, project_title);
