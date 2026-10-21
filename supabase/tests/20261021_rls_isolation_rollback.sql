-- TEST DE SÉCURITÉ TRANSACTIONNEL — Mathas-Test UNIQUEMENT
-- NE PAS appliquer comme migration, NE PAS exécuter sur Math'as principal.
-- Script à lancer via execute_sql pour un test temporaire.
-- Toutes les lignes créées, même dans auth.users, sont annulées par ROLLBACK.
-- On teste le rôle PostgreSQL "authenticated" avec de fausses claims JWT.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.classes') IS NOT NULL THEN
   RAISE EXCEPTION 'REFUS: projet de production détecté (public.classes)';
 END IF;
 IF (SELECT count(*) FROM public.teacher_users) <> 0 THEN
   RAISE EXCEPTION 'REFUS: projet non vide teacher_users';
 END IF;
END
$guard$;
-- Utilisateurs Auth de banc d'essai, en transaction et jamais conservés.
INSERT INTO auth.users (id, aud, role, is_anonymous)
VALUES
 ('70000000-0000-4000-8000-000000000001','authenticated','authenticated',true),
 ('70000000-0000-4000-8000-000000000002','authenticated','authenticated',true),
 ('70000000-0000-4000-8000-000000000003','authenticated','authenticated',false);
INSERT INTO public.teacher_users(user_id)
VALUES ('70000000-0000-4000-8000-000000000003');
INSERT INTO public.mathas_student_groups(slug,display_name,academic_year)
VALUES ('test-isolation-20261021','Classe test', '2026-2027');
INSERT INTO public.mathas_students(id,login_name,first_name,private_display_name,surname_initial)
VALUES
 ('80000000-0000-4000-8000-000000000001','testa.x','Test A','Test A','X'),
 ('80000000-0000-4000-8000-000000000002','testb.y','Test B','Test B','Y');
INSERT INTO public.mathas_student_group_memberships(student_id,group_id)
SELECT st.id,g.id FROM public.mathas_students st
CROSS JOIN public.mathas_student_groups g
WHERE st.login_name in ('testa.x','testb.y') and g.slug='test-isolation-20261021';
INSERT INTO public.mathas_device_authorizations(auth_user_id,student_id)
VALUES
 ('70000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001'),
 ('70000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000002');
INSERT INTO public.mathas_student_attempts(student_id,application_id,client_event_id,score)
SELECT st.id,app.id,gen_random_uuid(),88 FROM public.mathas_students st
CROSS JOIN LATERAL (SELECT id FROM public.applications ORDER BY id LIMIT 1) app
WHERE st.login_name IN ('testa.x','testb.y');
INSERT INTO public.mathas_progress_events(student_id,application_id,client_event_id,event_kind,event_key)
SELECT st.id,app.id,gen_random_uuid(),'unlock','level2' FROM public.mathas_students st
CROSS JOIN LATERAL (SELECT id FROM public.applications ORDER BY id LIMIT 1) app
WHERE st.login_name IN ('testa.x','testb.y');
INSERT INTO public.mathas_student_app_states(student_id,application_id,schema_version,state_data)
SELECT st.id,app.id,1,'{"unlocked":["level2"]}'::jsonb FROM public.mathas_students st
CROSS JOIN LATERAL (SELECT id FROM public.applications ORDER BY id LIMIT 1) app
WHERE st.login_name IN ('testa.x','testb.y');

-- Chaque navigateur authentifié ne doit lire que son propre élève.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
DO $test$
DECLARE n integer;
BEGIN
 IF auth.uid() <> '70000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'jwt_context_failed'; END IF;
 SELECT count(*) INTO n FROM public.mathas_students;
 IF n<>1 THEN RAISE EXCEPTION 'student A sees % profiles instead of 1',n; END IF;
 SELECT count(*) INTO n FROM public.mathas_student_attempts;
 IF n<>1 THEN RAISE EXCEPTION 'student A sees % attempts instead of 1',n; END IF;
 SELECT count(*) INTO n FROM public.mathas_progress_events;
 IF n<>1 THEN RAISE EXCEPTION 'student A sees % rewards instead of 1',n; END IF;
 SELECT count(*) INTO n FROM public.mathas_student_app_states;
 IF n<>1 THEN RAISE EXCEPTION 'student A sees % states instead of 1',n; END IF;
 SELECT count(*) INTO n FROM public.mathas_student_group_memberships;
 IF n<>1 THEN RAISE EXCEPTION 'student A sees % memberships instead of 1',n; END IF;
END
$test$;

SELECT set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
DO $test$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.mathas_students;
 IF n<>1 THEN RAISE EXCEPTION 'student B sees % profiles instead of 1',n; END IF;
 SELECT count(*) INTO n FROM public.mathas_student_attempts;
 IF n<>1 THEN RAISE EXCEPTION 'student B sees % attempts instead of 1',n; END IF;
 SELECT count(*) INTO n FROM public.mathas_progress_events;
 IF n<>1 THEN RAISE EXCEPTION 'student B sees % rewards instead of 1',n; END IF;
END
$test$;

-- Élève sans autorisation : aucune donnée privée.
SELECT set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000099',true);
DO $test$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.mathas_students;
 IF n<>0 THEN RAISE EXCEPTION 'unapproved identity sees % students',n; END IF;
 SELECT count(*) INTO n FROM public.mathas_student_attempts;
 IF n<>0 THEN RAISE EXCEPTION 'unapproved identity sees % attempts',n; END IF;
END
$test$;

-- Professeur approuvé : les deux dossiers (sans se substituer aux élèves).
SELECT set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000003',true);
DO $test$
DECLARE n integer;
BEGIN
 IF NOT public.is_teacher() THEN RAISE EXCEPTION 'teacher lookup failed'; END IF;
 SELECT count(*) INTO n FROM public.mathas_students;
 IF n<>2 THEN RAISE EXCEPTION 'teacher sees % students instead of 2',n; END IF;
 SELECT count(*) INTO n FROM public.mathas_student_attempts;
 IF n<>2 THEN RAISE EXCEPTION 'teacher sees % attempts instead of 2',n; END IF;
END
$test$;

-- Révoquer l'appareil A sous rôle serveur, puis refaire le contrôle.
RESET ROLE;
UPDATE public.mathas_device_authorizations SET revoked_at=now()
WHERE auth_user_id='70000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
DO $test$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.mathas_students;
 IF n<>0 THEN RAISE EXCEPTION 'revoked device sees % students',n; END IF;
 SELECT count(*) INTO n FROM public.mathas_student_attempts;
 IF n<>0 THEN RAISE EXCEPTION 'revoked device sees % attempts',n; END IF;
END
$test$;
RESET ROLE;

-- Aucun INSERT/UPDATE/DELETE client direct dans les tables critiques.
DO $tests$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['mathas_students','mathas_student_attempts',
   'mathas_progress_events','mathas_student_app_states','mathas_device_authorizations',
   'mathas_launch_tickets','mathas_launch_sessions'] LOOP
  IF has_table_privilege('authenticated','public.'||t,'INSERT') OR
     has_table_privilege('authenticated','public.'||t,'UPDATE') OR
     has_table_privilege('authenticated','public.'||t,'DELETE') THEN
   RAISE EXCEPTION 'unexpected client write privilege on %',t;
  END IF;
 END LOOP;
END
$tests$;
ROLLBACK;
