-- MATH'AS — PROPOSITION DE MIGRATION V1 (NON APPLIQUÉE)
-- Cette migration est conservée UNIQUEMENT sur une branche de développement.
-- À auditer et tester dans un environnement isolé AVANT exécution sur Supabase.
-- Aucune donnée d'élève réelle à saisir pendant le pilote.
-- 2026-10-21
--
-- Hypothèses existantes vérifiées :
-- public.applications(id bigint PK), public.teacher_users(user_id uuid),
-- public.is_teacher() RETURNS boolean ; supabase Auth disponible.
--
-- Le serveur (Edge Functions) est le SEUL acteur autorisé à créer/modifier
-- les données critiques. Le navigateur n'a ici que des droits de lecture RLS.

begin;

-- 1. Types de catégories et options pour futures applications Math'as.
create table if not exists public.mathas_application_settings (
  application_id bigint primary key references public.applications(id) on delete cascade,
  ownership text not null default 'external'
    check (ownership in ('mathas','external')),
  app_kind text not null default 'exercice'
    check (app_kind in ('exercice','outil')),
  result_tracking text not null default 'hors_suivi'
    check (result_tracking in ('complet','pedagogique','hors_suivi')),
  sdk_version text,
  adapter_version text,
  scoring_version text,
  scoring_direction text not null default 'higher'
    check (scoring_direction in ('higher','lower','none')),
  supports_progress boolean not null default false,
  supports_rewards boolean not null default false,
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint mathas_external_hors_suivi
    check (ownership = 'mathas' or result_tracking = 'hors_suivi'),
  constraint mathas_outil_hors_suivi_default_not_forced
    check (true)
);
-- IMPORTANT : pas d'activation automatique du suivi des applis déjà listées.
insert into public.mathas_application_settings(application_id,ownership,app_kind,result_tracking)
select id,
  case when url ~* '^https://mr-tat[.]github[.]io/' then 'mathas' else 'external' end,
  case when nom ~* 'outil' then 'outil' else 'exercice' end,
  'hors_suivi'
from public.applications
on conflict (application_id) do nothing;
-- Le propriétaire et la nature sont des PRÉSÉLECTIONS à contrôler dans l'admin.
-- La catégorie actuelle du HUB ('niveau = outil') n'est PAS la source de vérité.

-- 2. Groupes scolaires, distincts des pages du HUB.
create table if not exists public.mathas_student_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{1,48}$'),
  display_name text not null check (char_length(display_name) between 1 and 90),
  hub_class_slug text, -- simple suggestion, jamais preuve d'appartenance
  academic_year text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Identité métier STABLE : jamais l'identité de navigateur.
create table if not exists public.mathas_students (
  id uuid primary key default gen_random_uuid(),
  login_name text not null unique
    check (login_name = lower(login_name) and login_name ~ '^[a-z0-9][a-z0-9._-]{1,63}$'),
  first_name text not null check (char_length(first_name) between 1 and 90),
  surname_initial text check (surname_initial is null or char_length(surname_initial) = 1),
  private_display_name text not null check (char_length(private_display_name) between 1 and 96),
  approved_public_alias text check (approved_public_alias is null or char_length(approved_public_alias) between 2 and 32),
  public_opt_in boolean not null default false,
  avatar_kind text not null default 'animal' check (avatar_kind in ('animal','letter')),
  avatar_value text not null default 'fox',
  avatar_color text not null default 'blue'
    check (avatar_color in ('blue','green','yellow','purple','pink','turquoise','sand','indigo')),
  account_status text not null default 'active' check (account_status in ('active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.mathas_students is 'Identité Mathas permanente. Ne jamais utiliser auth.users.id comme clé métier durable.';

create table if not exists public.mathas_student_group_memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.mathas_students(id) on delete cascade,
  group_id uuid not null references public.mathas_student_groups(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  approved_by uuid references auth.users(id),
  check (ended_at is null or ended_at >= started_at)
);
create unique index if not exists mathas_student_one_current_group
  on public.mathas_student_group_memberships(student_id) where ended_at is null;
create index if not exists mathas_memberships_group_idx
  on public.mathas_student_group_memberships(group_id, ended_at);

-- 4. Demande et autorisation des identités techniques Supabase Auth anonymes.
-- Un code de 6 caractères est affiché au POSTE élève : la DB ne conserve que
-- son hash. L'enseignant le RE-SAISIT, le serveur vérifie le hash et l'identité.
create table if not exists public.mathas_device_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  claimed_login text not null check (char_length(claimed_login) between 3 and 64),
  suggested_group_id uuid references public.mathas_student_groups(id),
  verification_code_hash text not null,
  failed_checks integer not null default 0 check (failed_checks >= 0),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending','approved','refused','expired','cancelled')),
  linked_student_id uuid references public.mathas_students(id),
  check (expires_at > requested_at)
);
create index if not exists mathas_device_requests_wait_idx
  on public.mathas_device_requests(status, requested_at);
create index if not exists mathas_device_requests_auth_idx
  on public.mathas_device_requests(auth_user_id, requested_at desc);

create table if not exists public.mathas_device_authorizations (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  student_id uuid not null references public.mathas_students(id) on delete cascade,
  device_label text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_seen_at timestamptz,
  check (revoked_at is null or revoked_at >= approved_at)
);
create index if not exists mathas_devices_student_idx
  on public.mathas_device_authorizations(student_id) where revoked_at is null;

-- 5. Pseudonymes : acceptation individuelle, avatars parmi options sûres.
create table if not exists public.mathas_alias_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.mathas_students(id) on delete cascade,
  proposed_alias text not null check (char_length(proposed_alias) between 2 and 32),
  status text not null default 'pending'
    check (status in ('pending','approved','refused','cancelled')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
create unique index if not exists mathas_alias_one_pending_per_student
  on public.mathas_alias_requests(student_id) where status = 'pending';

-- 6. Tentatives pédagogiques, jamais écrasées par un record ou reset de tableau.
create table if not exists public.mathas_student_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.mathas_students(id) on delete cascade,
  application_id bigint not null references public.applications(id) on delete restrict,
  client_event_id uuid not null,
  app_version text,
  scoring_version text,
  difficulty text,
  mode text not null default 'normal',
  level_key text,
  score numeric(14,3) not null,
  score_max numeric(14,3),
  points numeric(14,3),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  correct_count integer check (correct_count is null or correct_count >= 0),
  question_count integer check (question_count is null or question_count >= 0),
  occurred_at_client timestamptz,
  received_at timestamptz not null default now(),
  group_id_at_attempt uuid references public.mathas_student_groups(id),
  reset_epoch integer not null default 0 check (reset_epoch >= 0),
  validation_status text not null default 'accepted'
    check (validation_status in ('accepted','quarantined','rejected')),
  extra jsonb not null default '{}'::jsonb,
  unique(student_id, application_id, client_event_id),
  check (score_max is null or score_max >= 0),
  check (question_count is null or correct_count is null or correct_count <= question_count),
  check (octet_length(extra::text) <= 8192)
);
create index if not exists mathas_attempts_student_app_date
  on public.mathas_student_attempts(student_id,application_id,received_at desc);
create index if not exists mathas_attempts_group_date
  on public.mathas_student_attempts(group_id_at_attempt,received_at desc);

-- 7. Trophées, médailles durables, jalons et déblocages.
-- Un événement = un gain unique; jamais un simple remplacement de tout le cache.
create table if not exists public.mathas_progress_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.mathas_students(id) on delete cascade,
  application_id bigint not null references public.applications(id) on delete restrict,
  client_event_id uuid not null,
  event_kind text not null
    check (event_kind in ('trophy','medal','unlock','milestone','progress','reset')),
  event_key text not null check (char_length(event_key) between 1 and 160),
  event_data jsonb not null default '{}'::jsonb,
  reset_epoch integer not null default 0 check (reset_epoch >= 0),
  occurred_at_client timestamptz,
  received_at timestamptz not null default now(),
  unique(student_id,application_id,client_event_id),
  check (octet_length(event_data::text) <= 8192)
);
create index if not exists mathas_progress_student_app_date
  on public.mathas_progress_events(student_id,application_id,received_at desc);

-- 8. État révisable de chaque jeu. Adaptateur spécifique obligatoire.
create table if not exists public.mathas_student_app_states (
  student_id uuid not null references public.mathas_students(id) on delete cascade,
  application_id bigint not null references public.applications(id) on delete restrict,
  schema_version integer not null default 1 check (schema_version > 0),
  revision bigint not null default 0 check (revision >= 0),
  reset_epoch integer not null default 0 check (reset_epoch >= 0),
  state_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(student_id,application_id),
  check (octet_length(state_data::text) <= 32768)
);

-- 9. Tickets de lancement : secret stocké seulement sous forme hash côté serveur.
-- Utilisés par les Edge Functions. Ne pas exposer ces tables directement au web.
create table if not exists public.mathas_launch_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_hash text not null unique,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.mathas_students(id) on delete cascade,
  application_id bigint not null references public.applications(id) on delete cascade,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  check (expires_at > issued_at)
);
create index if not exists mathas_launch_ticket_expiry_idx
  on public.mathas_launch_tickets(expires_at);

create table if not exists public.mathas_launch_sessions (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null unique,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.mathas_students(id) on delete cascade,
  application_id bigint not null references public.applications(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > created_at)
);
create index if not exists mathas_launch_sessions_auth_app_idx
  on public.mathas_launch_sessions(auth_user_id,application_id,expires_at);

-- 10. Classements facultatifs : publication distincte des résultats privés.
-- La validation serveur doit confirmer le record hebdomadaire et le consentement.
create table if not exists public.mathas_score_periods (
  id uuid primary key default gen_random_uuid(),
  application_id bigint not null references public.applications(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid references auth.users(id),
  period_kind text not null default 'weekly' check (period_kind in ('weekly','manual')),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists mathas_score_periods_app_date
  on public.mathas_score_periods(application_id,starts_at desc);

create table if not exists public.mathas_score_publications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.mathas_students(id) on delete cascade,
  application_id bigint not null references public.applications(id) on delete cascade,
  period_id uuid not null references public.mathas_score_periods(id) on delete cascade,
  attempt_id uuid not null unique references public.mathas_student_attempts(id) on delete cascade,
  published_at timestamptz not null default now(),
  unique(student_id,application_id,period_id,attempt_id)
);
create index if not exists mathas_publications_period_idx
  on public.mathas_score_publications(period_id,published_at desc);

-- 11. Défense en profondeur pour tables élèves.
-- Aucun INSERT/UPDATE/DELETE direct pour les clients; via Edge Functions contrôlées.
alter table public.mathas_application_settings enable row level security;
alter table public.mathas_student_groups enable row level security;
alter table public.mathas_students enable row level security;
alter table public.mathas_student_group_memberships enable row level security;
alter table public.mathas_device_requests enable row level security;
alter table public.mathas_device_authorizations enable row level security;
alter table public.mathas_alias_requests enable row level security;
alter table public.mathas_student_attempts enable row level security;
alter table public.mathas_progress_events enable row level security;
alter table public.mathas_student_app_states enable row level security;
alter table public.mathas_launch_tickets enable row level security;
alter table public.mathas_launch_sessions enable row level security;
alter table public.mathas_score_periods enable row level security;
alter table public.mathas_score_publications enable row level security;

-- Le changement annoncé des GRANT automatiques en octobre 2026 est pris en
-- compte : GRANT explicites + RLS, dans la même migration.
revoke all on
  public.mathas_application_settings,public.mathas_student_groups,
  public.mathas_students,public.mathas_student_group_memberships,
  public.mathas_device_requests,public.mathas_device_authorizations,
  public.mathas_alias_requests,public.mathas_student_attempts,
  public.mathas_progress_events,public.mathas_student_app_states,
  public.mathas_launch_tickets,public.mathas_launch_sessions,
  public.mathas_score_periods,public.mathas_score_publications
from anon,authenticated;

grant select on
  public.mathas_application_settings,public.mathas_student_groups,
  public.mathas_students,public.mathas_student_group_memberships,
  public.mathas_device_requests,public.mathas_device_authorizations,
  public.mathas_alias_requests,public.mathas_student_attempts,
  public.mathas_progress_events,public.mathas_student_app_states,
  public.mathas_score_periods,public.mathas_score_publications
to authenticated;

-- 'service_role' seul peut écrire côté serveur ; aucune clé secrète dans GitHub.
grant select,insert,update,delete on
  public.mathas_application_settings,public.mathas_student_groups,
  public.mathas_students,public.mathas_student_group_memberships,
  public.mathas_device_requests,public.mathas_device_authorizations,
  public.mathas_alias_requests,public.mathas_student_attempts,
  public.mathas_progress_events,public.mathas_student_app_states,
  public.mathas_launch_tickets,public.mathas_launch_sessions,
  public.mathas_score_periods,public.mathas_score_publications
to service_role;

-- Visibilité admin : le compte Supabase connecté DOIT exister dans teacher_users.
create policy mathas_settings_teacher_select on public.mathas_application_settings
  for select to authenticated using (public.is_teacher());
create policy mathas_groups_teacher_select on public.mathas_student_groups
  for select to authenticated using (public.is_teacher());
create policy mathas_students_teacher_select on public.mathas_students
  for select to authenticated using (public.is_teacher());
create policy mathas_members_teacher_select on public.mathas_student_group_memberships
  for select to authenticated using (public.is_teacher());
create policy mathas_requests_teacher_select on public.mathas_device_requests
  for select to authenticated using (public.is_teacher());
create policy mathas_devices_teacher_select on public.mathas_device_authorizations
  for select to authenticated using (public.is_teacher());
create policy mathas_alias_teacher_select on public.mathas_alias_requests
  for select to authenticated using (public.is_teacher());
create policy mathas_attempts_teacher_select on public.mathas_student_attempts
  for select to authenticated using (public.is_teacher());
create policy mathas_progress_teacher_select on public.mathas_progress_events
  for select to authenticated using (public.is_teacher());
create policy mathas_states_teacher_select on public.mathas_student_app_states
  for select to authenticated using (public.is_teacher());
create policy mathas_periods_teacher_select on public.mathas_score_periods
  for select to authenticated using (public.is_teacher());
create policy mathas_publications_teacher_select on public.mathas_score_publications
  for select to authenticated using (public.is_teacher());

-- Accès élève en lecture à ses propres données APRÈS validation de l'appareil.
-- Ne jamais faire auth.uid() = mathas_students.id : identité durable ≠ Auth.
create policy mathas_devices_self_select on public.mathas_device_authorizations
  for select to authenticated using (auth_user_id = (select auth.uid()));
create policy mathas_students_self_select on public.mathas_students
  for select to authenticated using (
    account_status = 'active' and exists (
      select 1 from public.mathas_device_authorizations d
      where d.student_id = id and d.auth_user_id = (select auth.uid()) and d.revoked_at is null
    )
  );
create policy mathas_groups_self_select on public.mathas_student_groups
  for select to authenticated using (exists (
    select 1 from public.mathas_student_group_memberships m
    join public.mathas_device_authorizations d on d.student_id=m.student_id
    where m.group_id=public.mathas_student_groups.id and m.ended_at is null
      and d.auth_user_id=(select auth.uid()) and d.revoked_at is null
  ));
create policy mathas_members_self_select on public.mathas_student_group_memberships
  for select to authenticated using (exists (
    select 1 from public.mathas_device_authorizations d
    where d.student_id=public.mathas_student_group_memberships.student_id and d.auth_user_id=(select auth.uid()) and d.revoked_at is null
  ));
create policy mathas_alias_self_select on public.mathas_alias_requests
  for select to authenticated using (exists (
    select 1 from public.mathas_device_authorizations d
    where d.student_id=public.mathas_alias_requests.student_id and d.auth_user_id=(select auth.uid()) and d.revoked_at is null
  ));
create policy mathas_attempts_self_select on public.mathas_student_attempts
  for select to authenticated using (exists (
    select 1 from public.mathas_device_authorizations d
    where d.student_id=public.mathas_student_attempts.student_id and d.auth_user_id=(select auth.uid()) and d.revoked_at is null
  ));
create policy mathas_progress_self_select on public.mathas_progress_events
  for select to authenticated using (exists (
    select 1 from public.mathas_device_authorizations d
    where d.student_id=public.mathas_progress_events.student_id and d.auth_user_id=(select auth.uid()) and d.revoked_at is null
  ));
create policy mathas_states_self_select on public.mathas_student_app_states
  for select to authenticated using (exists (
    select 1 from public.mathas_device_authorizations d
    where d.student_id=public.mathas_student_app_states.student_id and d.auth_user_id=(select auth.uid()) and d.revoked_at is null
  ));
create policy mathas_publications_self_select on public.mathas_score_publications
  for select to authenticated using (exists (
    select 1 from public.mathas_device_authorizations d
    where d.student_id=public.mathas_score_publications.student_id and d.auth_user_id=(select auth.uid()) and d.revoked_at is null
  ));

-- Pas de politique d'accès client aux secrets (tickets/session).
-- Pas de politique d'écriture client sur une table élève.
-- Les vues agrégées publiques pour le tableau seront produites séparément
-- après revue des règles de confidentialité et consentement.

commit;
