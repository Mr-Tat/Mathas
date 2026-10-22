-- LAB ONLY: restrict remaining global teacher reads without breaking device requests.
-- app settings: only a real (non-anonymous Auth) teacher with at least one explicitly
-- assigned group and an active can_view_results grant.
alter policy mathas_settings_teacher_select
on public.mathas_application_settings
using (
  coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false
  and exists (
    select 1 from public.mathas_teacher_group_permissions p
    where p.teacher_id=(select auth.uid()) and p.can_view_results=true
  )
);
-- Periods have no group_id. Restrict to creator until a per-group model exists.
alter policy mathas_periods_teacher_select
on public.mathas_score_periods
using (
  created_by=(select auth.uid())
  and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false
  and exists (
    select 1 from public.mathas_teacher_group_permissions p
    where p.teacher_id=(select auth.uid()) and p.can_view_results=true
  )
);
-- Keep mathas_requests_teacher_select unchanged until request_device stores
-- a server-verified assigned group; otherwise all current ungrouped pending
-- requests would become invisible. Never trust a group_id alone from browser.