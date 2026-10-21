-- Mathas-Test uniquement. Synchronisation manuelle LAB de la progression et
-- des trophees de la vraie addition, jamais les recompenses officielles.
-- Les valeurs du navigateur sont non verifiees et ne prouvent aucun succes.
begin;
do $$
begin
 if to_regclass('public.classes') is not null
    or to_regclass('public.mathas_lab_scores') is null then
   raise exception 'mathas_test_only';
 end if;
end $$;
create table public.mathas_lab_addition_progress (
 student_id uuid primary key references public.mathas_students(id) on delete cascade,
 application_id bigint not null default 1 references public.applications(id),
 schema_version integer not null default 1 check (schema_version=1),
 progression jsonb not null default '{}'::jsonb,
 trophies jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 constraint mathas_lab_progress_app_check check (application_id=1),
 constraint mathas_lab_progress_progress_shape check (
   jsonb_typeof(progression)='object' and octet_length(progression::text)<=1500
 ),
 constraint mathas_lab_progress_trophies_shape check (
   jsonb_typeof(trophies)='object' and octet_length(trophies::text)<=2400
 )
);
alter table public.mathas_lab_addition_progress enable row level security;
revoke all on public.mathas_lab_addition_progress from public,anon,authenticated;
grant select,insert,update on public.mathas_lab_addition_progress to authenticated;
grant all on public.mathas_lab_addition_progress to service_role;
create policy mathas_lab_addition_progress_self_select
on public.mathas_lab_addition_progress for select to authenticated
using (
 exists (
  select 1 from public.mathas_device_authorizations d
  join public.mathas_students s on s.id=d.student_id
  where d.auth_user_id=(select auth.uid()) and d.revoked_at is null
    and d.student_id=mathas_lab_addition_progress.student_id
    and s.account_status='active'
 )
);
create policy mathas_lab_addition_progress_self_insert
on public.mathas_lab_addition_progress for insert to authenticated
with check (
 exists (
  select 1 from public.mathas_device_authorizations d
  join public.mathas_students s on s.id=d.student_id
  where d.auth_user_id=(select auth.uid()) and d.revoked_at is null
    and d.student_id=mathas_lab_addition_progress.student_id
    and s.account_status='active'
 )
);
create policy mathas_lab_addition_progress_self_update
on public.mathas_lab_addition_progress for update to authenticated
using (
 exists (
  select 1 from public.mathas_device_authorizations d
  join public.mathas_students s on s.id=d.student_id
  where d.auth_user_id=(select auth.uid()) and d.revoked_at is null
    and d.student_id=mathas_lab_addition_progress.student_id
    and s.account_status='active'
 )
)
with check (
 exists (
  select 1 from public.mathas_device_authorizations d
  join public.mathas_students s on s.id=d.student_id
  where d.auth_user_id=(select auth.uid()) and d.revoked_at is null
    and d.student_id=mathas_lab_addition_progress.student_id
    and s.account_status='active'
 )
);
create policy mathas_lab_addition_progress_teacher_select
on public.mathas_lab_addition_progress for select to authenticated
using ((select public.is_teacher()));
comment on table public.mathas_lab_addition_progress is
 'LAB UNIQUEMENT. Valeurs client non verifiees. A exclure des trophees officiels.';
commit;
