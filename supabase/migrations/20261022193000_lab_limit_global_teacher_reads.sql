-- LAB only. Private helper avoids direct SELECT on confidential grants.
create or replace function mathas_private.teacher_has_any_group()
returns boolean language sql stable security definer set search_path=''
as $$
 select coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false
 and exists (select 1 from public.mathas_teacher_group_permissions p
 where p.teacher_id=(select auth.uid()) and p.can_view_results=true);
$$;
revoke all on function mathas_private.teacher_has_any_group() from PUBLIC,anon;
grant execute on function mathas_private.teacher_has_any_group() to authenticated;
alter policy mathas_settings_teacher_select
on public.mathas_application_settings
using (mathas_private.teacher_has_any_group());
-- Score periods do not have group_id: creator only for this LAB stage.
alter policy mathas_periods_teacher_select
on public.mathas_score_periods
using (created_by=(select auth.uid()) and mathas_private.teacher_has_any_group());
-- Keep teacher access to ungrouped device requests unchanged until the
-- enrollment flow assigns a server-verified group.