-- Mathas-Test: protect lab writes after migrating the class-launch client.
begin;
do $$ begin
 if to_regclass('public.mathas_lab_addition_progress') is null
    or to_regclass('public.mathas_lab_scores') is null
 then raise exception 'not_mathas_test'; end if;
end $$;
alter table public.mathas_lab_addition_progress
  add column if not exists revision bigint not null default 1
  constraint mathas_lab_addition_revision_nonnegative check (revision>=0);
revoke insert, update, delete on public.mathas_lab_addition_progress from authenticated, anon;
revoke insert, update, delete on public.mathas_student_attempts from authenticated, anon;
comment on column public.mathas_lab_addition_progress.revision is
 'Optimistic locking for Mathas-Test class session synchronization';
commit;