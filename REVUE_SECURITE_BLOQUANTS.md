# Revue sécurité et limites bloquantes — 21 octobre 2026

**Ne pas déployer `supabase/functions/mathas-student-access/index.ts` en production.**
C'est un brouillon de contrat API avec validation utilisateur et séparations de rôles. Il **n'a pas encore été compilé, exécuté, soumis à tests RLS ou éprouvé contre les abus**.

## Points bloquants identifiés

1. **Validation atomique :** `approve_device` enchaîne création de profil, groupe, modification de demande et autorisation. En cas d'échec partiel, il peut y avoir des états incohérents. À remplacer par transaction SQL sécurisée ou fonction serveur idempotente ; vérifier les collisions de demandes et éviter qu'un compte nouvellement créé soit orphelin.
2. **Débit et concurrence :** les vérifications du nombre de demandes, échecs de code, tickets à usage unique et approbations doivent être atomiques. Prévoir un verrou / compteur serveur et un contrôle anti-abus indépendant des simples adresses IP partagées par l'école.
3. **Attestation de lancement :** une application GitHub Pages ne peut pas prouver à elle seule qu'un clic provient du HUB. Les tickets doivent être émis par un composant du HUB qui détient une vraie session élève, être liés à une origine/URL et une application autorisées et éviter la fuite dans referrers, logs et historique. Le code actuel n'a PAS implémenté le client HUB ni le transport de la session.
4. **Session navigateur partagée :** Auth anonyme Supabase est liée à un utilisateur Auth distinct de l'élève permanent. Il faut construire un stockage sécurisé par contexte (admin vs élève) sur l'origine `mr-tat.github.io`, sans écraser la session du professeur. Vérifier explicitement tout navigateur de l'école.
5. **RLS du HUB actuel :** des utilisateurs Auth anonymes ont le rôle `authenticated`. Les politiques prof utilisent `is_teacher()`; auditer toutes les fonctions `SECURITY DEFINER`, grants et permissions avant d'activer le fournisseur anonyme.
6. **Confirmation de présence :** le code d'activation **ne remplace pas une vérification de l'identité de l'élève** par le professeur. La validation doit comparer le code sur l'appareil réel et la fiche d'élève correspondante, sans publier des codes en clair dans la console prof. Éviter les identifiants supposés fiables depuis une URL.
7. **HUB de classe :** ne pas supposer que `?classe=...` fournit une preuve du groupe réel. Le groupe est associé lors de la validation, selon les permissions professeur. Les pages `thibault`, `lise`, `partage`, `toutes` ne créent jamais automatiquement d'élèves.
8. **Scores & progression :** aucune insertion cliente directe sans vérification des droits, du statut de l'application, de la session de lancement, du Master Mode et du barème. Les événements idempotents, le `reset_epoch`, les récompenses et le conflit de versions restent à implémenter. Les fonctions du SDK jettent donc `not_implemented`.
9. **Migrations :** la migration `20261021150000_mathas_students_foundation.sql` doit être testée intégralement sur une base isolée, revue par un auditeur technique, et les politiques examinées avant d'être appliquée. Elle n'a jamais été exécutée.
10. **Sûreté enfants :** durée de conservation, droit à l'effacement, export, consentement à la publication, unicité des pseudos, visibilité du tableau et supervision scolaire restent à traiter avant élèves réels.
11. **TypeScript :** vérifier la compilation de la fonction Edge dans l'environnement Supabase Deno, notamment le typage `asserts` et la signature des APIs. Ce fichier est encore un brouillon, pas un build validé.
12. **Sessions anonymes :** `signInAnonymously()` crée une identité Auth irrécupérable après perte de navigateur, donc le profil permanent appartient à `mathas_students`, et chaque nouvel appareil doit obtenir une nouvelle autorisation serveur. Vérifier les quotas/captcha et prévoir une maintenance des utilisateurs anonymes obsolètes.

## Ce qui est réellement prêt

- Branche GitHub isolée.
- Maquette fonctionnelle 100 % fictive `prototype-comptes.html`.
- Schéma SQL documenté mais non exécuté.
- Premier brouillon de service `mathas-student-access`.
- Premier brouillon de SDK JS **mode libre par défaut**.

## Avant de poursuivre les modifications de `main`

1. Valider le contrat d'identité et les rôles avec tests sur un environnement de développement.
2. Rendre les opérations d'activation atomiques.
3. Tester la restriction des écritures Supabase par une identité non approuvée.
4. Implémenter côté HUB la demande et validation des tickets.
5. Intégrer et vérifier une application pilote, avec test de liens directs et partagés.
6. Finaliser les scénarios panne PC, conflit d'état, scores locaux et réinitialisation.
7. Seulement après consentement explicite : préparer un déploiement planifié.
