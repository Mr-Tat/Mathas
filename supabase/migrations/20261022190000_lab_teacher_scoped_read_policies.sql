-- LAB uniquement : restriction des lectures professeur aux groupes explicitement attribués.
create schema if not exists mathas_private;
revoke all on schema mathas_private from PUBLIC, anon;
grant usage on schema mathas_private to authenticated;
create or replace function mathas_private.teacher_can_view_group(p_group uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select p_group is not null and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false
 and exists(select 1 from public.mathas_teacher_group_permissions p
 where p.teacher_id=(select auth.uid()) and p.group_id=p_group and p.can_view_results=true);
$$;
create or replace function mathas_private.teacher_can_view_student(p_student uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select p_student is not null and coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)=false
 and exists(select 1 from public.mathas_student_group_memberships m
 join public.mathas_teacher_group_permissions p on p.group_id=m.group_id
 where m.student_id=p_student and m.ended_at is null
 and p.teacher_id=(select auth.uid()) and p.can_view_results=true);
$$;
revoke all on function mathas_private.teacher_can_view_group(uuid) from PUBLIC,anon;
revoke all on function mathas_private.teacher_can_view_student(uuid) from PUBLIC,anon;
grant execute on function mathas_private.teacher_can_view_group(uuid) to authenticated;
grant execute on function mathas_private.teacher_can_view_student(uuid) to authenticated;
alter policy mathas_groups_teacher_select on public.mathas_student_groups using (mathas_private.teacher_can_view_group(id));
alter policy mathas_members_teacher_select on public.mathas_student_group_memberships using (mathas_private.teacher_can_view_group(group_id));
alter policy mathas_students_teacher_select on public.mathas_students using (mathas_private.teacher_can_view_student(id));
alter policy mathas_devices_teacher_select on public.mathas_device_authorizations using (mathas_private.teacher_can_view_student(student_id));
alter policy mathas_alias_teacher_select on public.mathas_alias_requests using (mathas_private.teacher_can_view_student(student_id));
alter policy mathas_attempts_teacher_select on public.mathas_student_attempts using (mathas_private.teacher_can_view_student(student_id));
alter policy mathas_progress_teacher_select on public.mathas_progress_events using (mathas_private.teacher_can_view_student(student_id));
alter policy mathas_states_teacher_select on public.mathas_student_app_states using (mathas_private.teacher_can_view_student(student_id));
alter policy mathas_publications_teacher_select on public.mathas_score_publications using (mathas_private.teacher_can_view_student(student_id));
alter policy mathas_lab_scores_teacher_read on public.mathas_lab_scores using (mathas_private.teacher_can_view_student(student_id));
alter policy mathas_lab_addition_progress_teacher_select on public.mathas_lab_addition_progress using (mathas_private.teacher_can_view_student(student_id));
-- Attention : demandes sans group_id, parametres globaux et periodes sans group_id restent a revoir.
