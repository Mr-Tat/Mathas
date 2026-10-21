-- Mathas-Test uniquement. Lecture des scores FICTIFS par un professeur autorise.
-- Le reste des politiques protege la lecture eleve et l'insertion.
begin;
do $$
begin
 if to_regclass('public.classes') is not null
    or to_regclass('public.mathas_lab_scores') is null
 then raise exception 'Migration reservee au laboratoire Mathas-Test'; end if;
end $$;
create policy mathas_lab_scores_teacher_read
  on public.mathas_lab_scores
  for select to authenticated
  using ((select public.is_teacher()));
commit;
