-- Разрешить пользователям отменять заявки на рассмотрении
DROP POLICY IF EXISTS "Users can delete their pending applications" ON user_applications;
CREATE POLICY "Users can delete their pending applications" ON user_applications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

GRANT DELETE ON user_applications TO authenticated;
