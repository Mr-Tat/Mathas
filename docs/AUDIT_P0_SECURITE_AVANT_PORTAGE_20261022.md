# Math'as — P0 audit avant portage GitHub Pages (22 octobre 2026)

Statut : **revue en lecture seule ; aucune modification Supabase**. Ce document n'autorise PAS la mise en production.

## Sources recontrolees
- Passages de flambeau HUB + LAB + addendum critique du 22/10.
- GitHub: branche feature/comptes-eleves-prototype-20261021 et branche feature/mathas-comptes-eleves-integration-20261021 du jeu.
- Supabase-Test bzdflehyuowbawdzuawh : catalogues, colonnes, politiques, droits SQL, fonctions actives.
- Production jftzuslpelgzbdrftszw : **aucune modification**.

## Bloquant P0-01 : autorisation professeur inter-classes
La table public.teacher_users ne comporte que user_id et created_at.
Les politiques teacher_select des tables mathas_* reposent sur is_teacher(), qui vérifie simplement l'existence dans teacher_users. Aucun lien professeur↔groupe autorisé n'est vérifié.
**Avant toute ouverture multi-classes**, introduire une table d'affectation explicite (teacher_id, group_id, permissions / statut), par défaut restrictive, puis filtrer RLS et les requêtes Edge selon le groupe *effectivement autorisé*. Étudier historique d'affectation pour les tentatives.
Ne pas accorder de lecture à tous les professeurs par défaut.

## P0-02 : fonctions et rôles
- public.is_teacher() est SECURITY DEFINER, callable by authenticated. L'appel retourne un booléen fondé sur auth.uid ; examiner le besoin de l'exposer, ainsi que les dépendances RLS, avant révocation de droits.
- public.mathas_approve_device_atomic et public.mathas_resolve_activity_access ne sont exécutables que par service_role sur le LAB vérifié.
- Les tables critiques n'autorisent pas l'écriture directe authenticated, sauf INSERT spécifique de mathas_lab_scores, qui reste LAB uniquement.

## P0-03 : différence déployé/source
- mathas-student-access déployée ACTIVE v2 ; des actions du code sont volontairement bloquées et les commentaires historiques ne prouvent pas un déploiement.
- mathas-lab-class-launch déployée ACTIVE v3 impose http://localhost:8765 et applicationId 1 : inutilisable telle quelle depuis GitHub Pages.
- SDK brouillon du HUB pointe vers l'URL Supabase production : interdiction d'activer ce SDK tel quel dans le LAB.

## P0-04 : validation et non-régression obligatoires
Vérifier avec vraies sessions et refus 401/403 : élève A/B, élève révoqué, logout profil avec autre onglet, professeur non affecté, faux professeur, double soumission, ticket expiré/rejoué, lien direct libre, conflit CAS, offline, reset, Master Mode.
Les tentatives LAB validation_status=quarantined ne prouvent pas un score certifié ; pas de classement public en V1.

## Portage P1
- Installer indicateur compte en haut à droite du flux normal du HUB, visiteur = mode libre.
- Conserver le localStorage libre indépendant, partitionner lié par élève avant chargement du jeu, ne pas importer les anciens records automatiquement.
- Supporter ticket à usage unique, session serveur après reload uniquement, interdiction de convertir une URL directe en session liée.
- Autoriser exactement les origines nécessaires pour les branches de test GitHub Pages, avec Auth JWT + vérifications serveur. CORS n'est pas une authentification.
- Ne pas introduire de timers réseau inutiles ; un événement idempotent par partie, écritures seulement si modifications, miniatures WebP 640px/cache long.

## Critères de feu vert production
Tests automatiques SQL (transaction rollback) + tests réseau Auth/Edge + parcours GitHub Pages réels + suivi de consommation + plan de rollback documenté + autorisation nouvelle et explicite de l'utilisateur.
