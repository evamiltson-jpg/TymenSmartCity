-- Migration: allow team owners to update and delete their teams
-- Affected tables: teams, user_teams

DROP POLICY IF EXISTS "Users can update own teams" ON teams;
CREATE POLICY "Users can update own teams" ON teams
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own teams" ON teams;
CREATE POLICY "Users can delete own teams" ON teams
  FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can leave teams" ON user_teams;
CREATE POLICY "Users can leave teams" ON user_teams
  FOR DELETE USING (user_id = auth.uid());
