# Math’as — Prototype comptes élèves (branche isolée)

**État : démonstration de parcours + migration SQL préparatoire, aucune connexion aux vraies données élèves.**

Ce dossier correspond à l'autorisation du 21 octobre 2026 : développer sur une branche distincte, ne **pas** modifier `main`, ne **pas** publier sur le HUB public et ne **pas** exécuter les migrations Supabase avant nouvelle validation.

## À ouvrir

- **`prototype-comptes.html`** (racine de la branche) : maquette fonctionnelle avec deux élèves *entièrement fictifs*. Aucun `fetch`, aucune création de compte, aucune lecture/écriture Supabase.
- **`supabase/migrations/20261021150000_mathas_students_foundation.sql`** : proposition de schéma SQL, **NON APPLIQUÉE** et **À AUDITER** avant usage réel.

Pour prévisualiser la maquette : télécharger `prototype-comptes.html` depuis la branche et ouvrir ce fichier dans un navigateur. Elle fonctionne aussi hors réseau.

## Parcours de test proposé dans la maquette

1. Onglet **Professeur** : une demande de Thomas D. apparaît, code **482731**.
2. Cliquer **Vérifier et accepter** et retaper le code qui apparaît sur son PC fictif.
3. Onglet **Élève**, choisir **PC de Thomas** : le profil, les récompenses et les déblocages sont désormais accessibles.
4. Modifier l'avatar/couleur, terminer une partie fictive.
5. Cliquer **Simuler une panne / perte de session**, puis choisir **Nouveau PC**.
6. Envoyer une demande `thomas.d`, l'approuver individuellement dans l'espace prof puis retourner sur le nouveau PC.
7. Vérifier que **scores, trophées et niveaux fictifs** réapparaissent.
8. Onglet **Accès libre** : l'exercice marche sans compte et sans attribution de points.

**Attention :** la validation réelle par code, la persistance sur plusieurs ordinateurs, le stockage des récompenses, la signature des tickets et la sécurité RLS nécessitent les composants serveur qui ne sont pas encore codés. Cette page simule uniquement le parcours et les règles.

## Règles produit fixées

- Comptes Math’as indépendants de Microsoft, aucun mot de passe quotidien.
- `prenom.initiale` est un identifiant lisible, jamais une authentification.
- Autorisation initiale **et chaque nouvel appareil** validés par l'enseignant, une à une.
- Profil et progression durables dans Supabase, identités techniques de navigateur remplaçables.
- Synchroniser scores, records, médailles, trophées, déblocages et progression.
- Le HUB classe utilise un ticket serveur par lancement ; accès directs / HUB partagés = **mode libre**, sans compte ni transmission de résultats.
- Hors système : les **3 URLs externes**. Pour les 15 applications GitHub, intégration au cas par cas.
- Paramètres indépendants : `Exercice/Outil` et `Complet/Pédagogique uniquement/Hors suivi`.
- Un `Outil` reçoit `Hors suivi` par défaut ; réglages modifiables par l'enseignant.
- Suivi uniquement des exercices terminés ; aucun score professeur/Master Mode.
- Pseudonymes modérés individuellement, avatar prédéfini libre (10 animaux/lettre + 8 couleurs).
- Scores publics facultatifs, privés automatiques pour activités suivies.
- Chargement léger, événements idempotents, pas de transferts à chaque clic.
- Ne pas remplacer les `localStorage` de jeux historiques avant contrôle des adaptateurs.

## Principaux éléments restant à développer (pas présentés comme fonctionnels)

1. Auth Supabase anonyme **avec audit RLS préalable** : les utilisateurs anonymes ont le rôle PostgreSQL `authenticated`. Tester qu'ils ne peuvent jamais modifier les données prof ni lire d'autres élèves.
2. Edge Functions : création de demande, comparaison/expiration du code, autorisation/révocation, restauration d'identité et jetons de lancement à usage unique.
3. SDK JS commun versionné et adaptateur de progression par application, fusion d'états, conservation et réinitialisation des résultats.
4. Console prof authentifiée, demandes de pseudo, gestion des groupes, statistiques privées et tableau des scores.
5. Tests système avec **deux comptes fictifs et une vraie application pilote** dans un environnement non productif.
6. Politique de conservation/suppression des données enfants, contrôle des GRANT/RLS et éventuel plan de sauvegarde.
7. Vérifier la consommation Supabase et les quotas avant d'ouvrir l'inscription de toute une classe.

## Points d'attention sur la migration SQL

- **Brouillon de structure** : ne pas l'exécuter sans revue technique complète, tests RLS et confirmation explicite.
- N'ajoute que de nouvelles tables `mathas_*`, sans modifier les tables en place.
- Présélectionne les URLs `mr-tat.github.io` comme `mathas` et les URLs externes comme `external`; le suivi est `hors_suivi` pour toutes, jusqu'à validation réelle.
- Les Edge Functions doivent vérifier chaque mutation, jamais confier des droits de service à une page GitHub publique.
- Préparer des migrations **GRANT explicites** compte tenu de la modification annoncée des privilèges Supabase en octobre 2026.
- Les statistiques publiques auront leurs propres agrégats, sans fuite des données privées.
- Pour l'application `Outil`, classer visuellement et appliquer `Hors suivi` par défaut, mais ne pas confondre avec la catégorie locale d'un HUB.

## État GitHub

Branche : `feature/comptes-eleves-prototype-20261021`

La branche de travail dérive de `main`. Les fichiers ont été ajoutés **uniquement** à cette branche. Aucune migration Supabase ni publication GitHub Pages n'a été lancée.

Prochaine étape : revue de la migration et création du **premier vrai service d'autorisation** sur une branche sécurisée, puis pilote bout-en-bout sans élèves réels.
