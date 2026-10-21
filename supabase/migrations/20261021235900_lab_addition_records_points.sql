-- Mathas-Test seulement : records locaux, points et Top 3 (laboratoire).
-- Ce contenu vient du navigateur et ne doit jamais alimenter les classements officiels.
begin;
do $$
begin
  if to_regclass('public.classes') is not null
    or to_regclass('public.mathas_lab_addition_progress') is null
  then raise exception 'lab_only_mathas_test'; end if;
end $$;
alter table public.mathas_lab_addition_progress
  add column if not exists records jsonb not null default '{}'::jsonb,
  add column if not exists points_state jsonb not null default '{}'::jsonb;
alter table public.mathas_lab_addition_progress
  add constraint mathas_lab_addition_records_shape
    check (jsonb_typeof(records)='object' and octet_length(records::text)<=6000),
  add constraint mathas_lab_addition_points_shape
    check (jsonb_typeof(points_state)='object' and octet_length(points_state::text)<=8000);
comment on column public.mathas_lab_addition_progress.records is
  'LAB uniquement. Records locaux non verifies; ne vaut pas homologation d un score.';
comment on column public.mathas_lab_addition_progress.points_state is
  'LAB uniquement. Top du jour et records de points non verifies.';
commit;