-- Mathas-Test uniquement : preparer la suppression future d'un profil eleve.
-- Aucun eleve, compte Auth, appareil ou score n'est supprime par cette migration.
-- Les historiques de demandes approuvees ne doivent pas BLOQUER une suppression
-- du dossier permanent. Le futur service serveur supprimera aussi ces demandes
-- avant de supprimer le profil (et ses identites Auth via Auth Admin API).
begin;
do $$
begin
 if to_regclass('public.classes') is not null
    or to_regclass('public.mathas_lab_scores') is null then
   raise exception 'mathas_test_only';
 end if;
end $$;
alter table public.mathas_device_requests
  drop constraint mathas_device_requests_linked_student_id_fkey;
alter table public.mathas_device_requests
  add constraint mathas_device_requests_linked_student_id_fkey
    foreign key (linked_student_id) references public.mathas_students(id)
    on delete set null;
commit;
