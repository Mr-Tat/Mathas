-- ============================================================================
-- MATH'AS — AJOUT DU NIVEAU "JEUX"
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Ce script conserve toutes les données existantes.
-- ============================================================================

-- Supprime uniquement l'ancienne contrainte CHECK liée à la colonne "niveau",
-- quel que soit le nom que Supabase/PostgreSQL lui a donné.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'class_applications'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%niveau%'
  loop
    execute format(
      'alter table public.class_applications drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.class_applications
add constraint class_applications_niveau_check
check (
  niveau in ('objectif', 'depassement', 'revision', 'outil', 'jeux')
);
