-- Check if RLS is enabled and what policies exist
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'usage_tracking', 'portfolios', 'stocks', 'investment_theses', 'daily_checklists', 'checklist_tasks', 'waitlist')
ORDER BY tablename;

-- Check what policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
