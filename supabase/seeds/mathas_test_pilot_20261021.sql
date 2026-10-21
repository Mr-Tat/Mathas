-- Mathas-Test uniquement : groupe fictif pour le parcours d'activation.
-- Ne contient aucun nom d'eleve et ne touche pas aux comptes Auth.
do $$
begin
  if to_regclass('public.classes') is not null then
    raise exception 'Interdit sur le projet principal Mathas';
  end if;
end $$;

insert into public.mathas_student_groups
  (slug,display_name,academic_year,active)
values ('pilote-fictif-2026','Classe fictive de test','2026-2027',true)
on conflict (slug) do nothing;
