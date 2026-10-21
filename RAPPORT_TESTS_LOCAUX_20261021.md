# Rapport de vérification locale — 21 octobre 2026

**Aucun déploiement Supabase / aucune modification de main.**

## Tests effectués
- Exécution avec Node.js v22 du fichier `tests/mathas-student-sdk.test.cjs` et du code SDK correspondant (copiés en environnement local, sans réseau).
- **7 tests réussis / 7**, zéro échec, vérification simulée du mode libre et du refus de ticket.
- La fonction Edge et les migrations SQL n'ont PAS été exécutées. Pas de test PostgreSQL ni d'authentification réelle.

## Corrections réalisées ensuite sur branche
- `supabase/functions/mathas-student-access/index.ts` : fonction d'assertion TypeScript; comparaison du code et compteur d'erreurs uniquement dans RPC transactionnelle.
- `supabase/migrations/20261021160000_mathas_approval_atomic_draft.sql` : une identité technique déjà liée à un élève, même révoquée, ne peut pas être réattribuée.
- Les règles RLS précédemment corrigées utilisent les identifiants de lignes explicites, afin de réduire le risque de lire les données d'un autre élève.

## Restent bloquants avant vrai usage
- Faire tourner la migration de fondation puis la migration transactionnelle sur une base isolée.
- Compiler et tester le code Edge Deno/Supabase, notamment types, service-role, CORS, quotas et exceptions.
- Modéliser et tester les transitions d'état atomiques pour les demandes concurrentes et renouvellements après expiration.
- Le tableau de validation professeur devra être réellement connecté avec authentification sécurisée, seulement après tests serveur.
- Ne pas envoyer de données élèves réelles pour le prototype.
- Les scores et progrès ne sont volontairement pas encore enregistrés côté serveur.
- Obtenir un devis officiel et l'accord avant création d'un environnement Supabase séparé.
