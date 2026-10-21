-- Mathas-Test uniquement : tentatives de la VRAIE application Addition simple.
-- Ecritures navigateur restreintes aux tentatives quarantined de laboratoire.
-- Ne donne JAMAIS accès aux scores officiels.
begin;
do $$
begin
  if to_regclass('public.classes') is not null
     or to_regclass('public.mathas_lab_scores') is null then
    raise exception 'only_Mathas_Test_lab';
  end if;
end $$;

grant insert (
  student_id, application_id, client_event_id,
  app_version, scoring_version, difficulty, mode, level_key,
  score, score_max, points, duration_ms, correct_count,
  question_count, occurred_at_client, validation_status, extra
) on public.mathas_student_attempts to authenticated;

create policy mathas_lab_real_addition_insert on public.mathas_student_attempts
  for insert to authenticated
  with check (
    application_id = 1
    and mode = 'laboratoire'
    and validation_status = 'quarantined'
    and score between 0 and 1000
    and (score_max is null or score_max between 1 and 20)
    and (correct_count is null or correct_count between 0 and 1000)
    and (question_count is null or question_count between 1 and 20)
    and extra ->> 'lab_only' = 'true'
    and extra ->> 'game_mode' in ('classic','sudden','hard_challenge','hard_sudden')
    and (extra ->> 'source') = 'addition-ecrite-simple-lab'
    and exists (
      select 1 from public.mathas_device_authorizations d
      join public.mathas_students s on s.id=d.student_id
      where d.student_id=mathas_student_attempts.student_id
        and d.auth_user_id=(select auth.uid())
        and d.revoked_at is null
        and s.account_status='active'
    )
  );
commit;
