-- Math'as LAB P0 : fondation des droits professeur par groupe.
-- NE PAS déployer en production sans audit/autorisation explicite.
create table if not exists public.mathas_teacher_group_permissions (
  teacher_id uuid not null references public.teacher_users(user_id) on delete cascade,
  group_id uuid not null references public.mathas_student_groups(id) on delete cascade,
  can_view_results boolean not null default false,
  can_manage_students boolean not null default false,
  granted_at timestamptz not null default now(),
  primary key (teacher_id, group_id)
);
alter table public.mathas_teacher_group_permissions enable row level security;
revoke all on public.mathas_teacher_group_permissions from public, anon, authenticated;
-- Le serveur gère exclusivement les affectations ; aucun GRANT client.
-- Initialisation conservatrice du professeur et du seul groupe déjà présents
-- dans le LAB, uniquement pour préserver le parcours pilote existant.
insert into public.mathas_teacher_group_permissions
 (teacher_id,group_id,can_view_results,can_manage_students)
select t.user_id,g.id,true,true
from public.teacher_users t cross join public.mathas_student_groups g
where (select count(*) from public.teacher_users)=1
  and (select count(*) from public.mathas_student_groups)=1
on conflict (teacher_id,group_id) do nothing;