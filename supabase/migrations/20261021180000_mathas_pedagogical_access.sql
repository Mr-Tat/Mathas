-- Math'as — socle des déblocages pédagogiques (pilote V0.1).
-- Exécution autorisée UNIQUEMENT sur Mathas-Test.
-- Aucun compte d'élève réel. Aucune modification du HUB de production.
-- Une activité est annoncée par l'application via une clé stable.
-- Les permissions restent distinctes du score, des médailles et des trophées.
begin;

create table public.mathas_activity_catalog (
  application_id bigint not null references public.applications(id) on delete cascade,
  activity_key text not null
    check (activity_key ~ '^[a-z0-9][a-z0-9._-]{0,95}$'),
  label text not null check (char_length(label) between 1 and 120),
  default_open boolean not null default true,
  active boolean not null default true,
  manifest_version integer not null default 1 check (manifest_version >= 1),
  updated_at timestamptz not null default now(),
  primary key (application_id,activity_key)
);
comment on table public.mathas_activity_catalog is
  'Catalogue des unités d activité déclarées par chaque jeu Mathas. Une clé stable survit aux mises à jour.';

create table public.mathas_activity_access_rules (
  id uuid primary key default gen_random_uuid(),
  application_id bigint not null,
  activity_key text not null,
  scope_type text not null
    check (scope_type in ('application','group','student')),
  group_id uuid references public.mathas_student_groups(id) on delete cascade,
  student_id uuid references public.mathas_students(id) on delete cascade,
  allowed boolean not null,
  reason text check (reason is null or char_length(reason) <= 240),
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mathas_activity_rules_catalog_fkey
    foreign key (application_id,activity_key)
    references public.mathas_activity_catalog(application_id,activity_key)
    on delete cascade,
  constraint mathas_activity_rule_scope_check check (
    (scope_type='application' and group_id is null and student_id is null)
    or (scope_type='group' and group_id is not null and student_id is null)
    or (scope_type='student' and student_id is not null and group_id is null)
  )
);
-- Une seule règle à chaque niveau, sans doublons de NULL.
create unique index mathas_activity_access_application_uq
  on public.mathas_activity_access_rules(application_id,activity_key)
  where scope_type='application';
create unique index mathas_activity_access_group_uq
  on public.mathas_activity_access_rules(application_id,activity_key,group_id)
  where scope_type='group';
create unique index mathas_activity_access_student_uq
  on public.mathas_activity_access_rules(application_id,activity_key,student_id)
  where scope_type='student';
create index mathas_activity_access_student_idx
  on public.mathas_activity_access_rules(student_id) where student_id is not null;
create index mathas_activity_access_group_idx
  on public.mathas_activity_access_rules(group_id) where group_id is not null;

-- Le professeur définira les règles via un service autorisé, PAS via le navigateur.
alter table public.mathas_activity_catalog enable row level security;
alter table public.mathas_activity_access_rules enable row level security;
revoke all on public.mathas_activity_catalog, public.mathas_activity_access_rules
  from public, anon, authenticated;
grant select, insert, update, delete on
  public.mathas_activity_catalog, public.mathas_activity_access_rules
  to service_role;

-- Résolution au serveur uniquement : élève > groupe actuel > application > défaut.
-- Une activité désactivée, un élève suspendu, une app externe ou inconnue
-- ne devient JAMAIS accessible par une règle favorable.
-- Cette fonction ne doit jamais être directement callable par le navigateur.
create or replace function public.mathas_resolve_activity_access(
  p_student_id uuid,
  p_application_id bigint,
  p_activity_key text
)
returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $function$
declare
  v_default boolean;
  v_active boolean;
  v_student_status text;
  v_ownership text;
  v_app_active boolean;
  v_app_url text;
  v_group_id uuid;
  v_allowed boolean;
  v_scope text;
begin
  if p_student_id is null or p_application_id is null or
     p_activity_key is null or p_activity_key = '' then
    return jsonb_build_object('allowed',false,'source','invalid_input');
  end if;

  select c.default_open, c.active, s.account_status, cfg.ownership, a.actif, a.url
    into v_default, v_active, v_student_status, v_ownership, v_app_active, v_app_url
  from public.mathas_activity_catalog c
  join public.mathas_application_settings cfg
    on cfg.application_id = c.application_id
  join public.applications a
    on a.id = c.application_id
  join public.mathas_students s
    on s.id = p_student_id
  where c.application_id = p_application_id
    and c.activity_key = p_activity_key;

  if not found then
    return jsonb_build_object('allowed',false,'source','unknown_activity_or_student');
  end if;
  if not v_active or v_student_status <> 'active'
     or v_ownership <> 'mathas' or not v_app_active
     or v_app_url not like 'https://mr-tat.github.io/%' then
    return jsonb_build_object('allowed',false,'source','inactive_or_untrusted');
  end if;

  select m.group_id into v_group_id
  from public.mathas_student_group_memberships m
  join public.mathas_student_groups g on g.id = m.group_id
  where m.student_id = p_student_id
    and m.ended_at is null and g.active = true
  order by m.started_at desc limit 1;

  select r.allowed, r.scope_type into v_allowed, v_scope
  from public.mathas_activity_access_rules r
  where r.application_id = p_application_id
    and r.activity_key = p_activity_key
    and (
      (r.scope_type='student' and r.student_id=p_student_id)
      or (r.scope_type='group' and r.group_id=v_group_id)
      or (r.scope_type='application')
    )
  order by case r.scope_type
    when 'student' then 1 when 'group' then 2 else 3 end
  limit 1;

  if found then
    return jsonb_build_object('allowed',v_allowed,'source',v_scope);
  end if;
  return jsonb_build_object('allowed',v_default,'source','default');
end;
$function$;

revoke all on function public.mathas_resolve_activity_access(uuid,bigint,text)
  from public, anon, authenticated;
grant execute on function public.mathas_resolve_activity_access(uuid,bigint,text)
  to service_role;

commit;
