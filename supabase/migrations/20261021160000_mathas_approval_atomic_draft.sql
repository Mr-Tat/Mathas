-- Math'as - draft V0.2, NON APPLIQUÉ - compléments à la migration V1
-- Ce fichier doit être révisé/testé en base de DEVELOPPEMENT avant usage.
-- La fonction publique n'est PAS accessible aux clients navigateur.
-- Elle doit être appelée uniquement par l'Edge Function avec service_role.
begin;

-- Ne pas autoriser simultanément deux demandes pendantes pour la même
-- identité technique. Les tentatives expirées doivent être clôturées avant.
create unique index if not exists mathas_one_pending_device_request
  on public.mathas_device_requests(auth_user_id)
  where status = 'pending';

-- La confirmation enseignant est ATOMIQUE :
-- demande verrouillée, code validé, élève récupéré/créé, affectation,
-- appareil lié et demande approuvée dans la MÊME transaction.
create or replace function public.mathas_approve_device_atomic(
  p_teacher_id uuid,
  p_request_id uuid,
  p_code_hash text,
  p_first_name text default null,
  p_initial text default null,
  p_group_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  r public.mathas_device_requests%rowtype;
  st public.mathas_students%rowtype;
  old_link public.mathas_device_authorizations%rowtype;
  current_group public.mathas_student_group_memberships%rowtype;
  requested_login text;
begin
  if not exists (select 1 from public.teacher_users where user_id=p_teacher_id)
  then return jsonb_build_object('ok',false,'code','teacher_required'); end if;

  -- L'ID appartient à une demande connue, verrouillée contre requêtes concurrentes.
  select * into r
  from public.mathas_device_requests where id=p_request_id for update;
  if not found then
    return jsonb_build_object('ok',false,'code','request_missing');
  end if;
  if r.status<>'pending' or r.expires_at<=now() then
    return jsonb_build_object('ok',false,'code','request_expired_or_handled');
  end if;
  if r.failed_checks>=5 then
    return jsonb_build_object('ok',false,'code','too_many_code_checks');
  end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' or
     r.verification_code_hash <> p_code_hash
  then
    -- Important : retourner au lieu de lever EXCEPTION => l'incrément est COMMIT.
    update public.mathas_device_requests
      set failed_checks=failed_checks+1
      where id=r.id;
    return jsonb_build_object('ok',false,'code','wrong_verification_code');
  end if;

  select * into old_link from public.mathas_device_authorizations
    where auth_user_id=r.auth_user_id for update;
  -- Une identité technique déjà liée, même révoquée, ne peut plus être
  -- réaffectée. Repartir d'une nouvelle session Auth anonyme.
  if found then
    return jsonb_build_object('ok',false,'code','identity_already_used');
  end if;

  -- Valider l'ensemble des entrées avant TOUT INSERT ; une erreur retournée
  -- (sans exception) ne doit jamais laisser un compte partiellement créé.
  if p_group_id is null or not exists (
    select 1 from public.mathas_student_groups
    where id=p_group_id and active=true
  ) then return jsonb_build_object('ok',false,'code','valid_group_required'); end if;
  requested_login:=lower(trim(r.claimed_login));
  select * into st from public.mathas_students
    where login_name=requested_login for update;
  if found then
    if st.account_status<>'active' then
      return jsonb_build_object('ok',false,'code','student_inactive');
    end if;
  else
    if p_first_name is null or length(trim(p_first_name))=0 or
       length(trim(p_first_name))>90 or
       p_initial is null or length(trim(p_initial))<>1 or
       p_group_id is null
    then return jsonb_build_object('ok',false,'code','identity_and_group_required'); end if;
    insert into public.mathas_students(login_name,first_name,surname_initial,private_display_name)
      values(requested_login,trim(p_first_name),upper(trim(p_initial)),trim(p_first_name))
      returning * into st;
  end if;

  select * into current_group from public.mathas_student_group_memberships
    where student_id=st.id and ended_at is null for update;
  if found then
    if current_group.group_id<>p_group_id then
      return jsonb_build_object('ok',false,'code','group_mismatch');
    end if;
  else
    insert into public.mathas_student_group_memberships(student_id,group_id,approved_by)
      values(st.id,p_group_id,p_teacher_id);
  end if;

  insert into public.mathas_device_authorizations(
    auth_user_id,student_id,approved_by,approved_at,revoked_at
  ) values(r.auth_user_id,st.id,p_teacher_id,now(),null);

  update public.mathas_device_requests
    set status='approved',reviewed_at=now(),
      reviewed_by=p_teacher_id,linked_student_id=st.id
  where id=r.id and status='pending';
  return jsonb_build_object('ok',true,'studentId',st.id);
end;
$function$;

revoke all on function public.mathas_approve_device_atomic(
  uuid,uuid,text,text,text,uuid
) from public,anon,authenticated;
grant execute on function public.mathas_approve_device_atomic(
  uuid,uuid,text,text,text,uuid
) to service_role;

commit;
