MATH'AS — REFONTE GLOBAL / AUTRES
================================
Version préparée le 03/10/2026.

IMPORTANT
=========
Cette version est une grosse migration. Fais les étapes dans cet ordre.

ÉTAPE 1 — SUPABASE
==================
1. Ouvre Supabase.
2. Va dans SQL Editor.
3. Clique sur New query.
4. Ouvre le fichier :
   migration_refonte_global_autres.sql
5. Copie TOUT son contenu.
6. Colle-le dans Supabase.
7. Clique sur Run.
8. Attends que l'exécution soit terminée sans erreur.

Ce script :
- ajoute le nouveau fonctionnement des applis spéciales ;
- crée Thibault et Lise ;
- conserve 2 ECO ;
- crée Partage Niveau 1 et Partage Niveau 2 ;
- migre l'ancien Partage vers Partage Niveau 1 ;
- rend les liens Partage révocables ;
- crée le registre des utilisations d'images M / A ;
- conserve Objectif / Dépassement / Révision / Outils / Jeux ;
- conserve Niveau 1 / 2 / 3 / Autre / Extérieur pour Toutes.

ÉTAPE 2 — GITHUB / DÉPÔT MATHAS
================================
REMPLACE ces fichiers :
- config.js
- app.js
- styles.css
- teacher.html
- teacher.css
- teacher.js

AJOUTE ces nouveaux fichiers :
- teacher-other.html
- teacher-other.js

Ensuite :
1. Commit changes.
2. Attends le déploiement GitHub Pages.
3. Fais Ctrl + F5 sur la page prof.

NOUVELLE ORGANISATION
=====================
PAGE PROF PRINCIPALE : teacher.html
-----------------------------------
En haut :
- Observation
- Phase 1
- Phase 2
- Toutes
- Autres

Une grosse ligne orange sépare les raccourcis de l'administration.

Onglets d'administration :
- GLOBAL
- Observation
- Phase 1
- Phase 2
- Toutes les applis

GLOBAL
------
Une ligne = une application générale.
Colonnes :
- Observation
- Phase 1
- Phase 2
- Toutes les applis

Dans chaque classe :
- Visible
- Du jour (sauf Toutes)
- Niveau / section

Dernière colonne :
- Visible partout
- Cacher partout

Ces deux boutons agissent uniquement sur les quatre pages GLOBAL.
Ils ne touchent jamais 2 ECO, Thibault, Lise ou les pages Partage.

AUTRES : teacher-other.html
===========================
La page contient :
- 2 ECO
- Partage Niveau 1
- Partage Niveau 2
- Thibault
- Lise
- Images

2 ECO
-----
Fonctionne comme une vraie classe :
- Sélection du jour
- Objectif
- Dépassement
- Révision
- Outils
- Jeux

La section Jeux conserve la double confirmation avec Oui / Non
visuellement identiques et placés aléatoirement à chaque question.

2 ECO est indépendant du GLOBAL : les nouvelles applis GLOBAL ne lui sont
plus ajoutées automatiquement.

THIBAULT / LISE
---------------
Sections :
- Niveau 1
- Niveau 2
- Niveau 3
- Autre

Les scores sont affichés sur leurs pages élèves.

PARTAGE NIVEAU 1 / PARTAGE NIVEAU 2
------------------------------------
Dans l'administration, les deux pages sont bien distinctes.
Pour le visiteur, le titre affiché est simplement : Partage.

Chaque page a :
- Niveau 1
- Niveau 2
- Niveau 3
- Autre

Pas de scores.

Boutons :
- Copier le lien de partage
- Changer le lien de partage

Quand tu changes le lien :
- l'ancien lien cesse immédiatement de fonctionner ;
- le nouveau lien est créé et copié ;
- l'ancien lien affiche : « Ce lien de partage n'est plus actif ».

IMAGES
======
La section Images permet :
- d'envoyer plusieurs images d'un coup ;
- de choisir un seul dossier pour tout le lot ;
- de parcourir les images par miniatures ;
- de filtrer par dossier ;
- de chercher par nom ;
- de copier l'URL ;
- d'ouvrir l'image ;
- de supprimer une image avec avertissement.

Badges :
- M = utilisée dans Math'as ou une application ;
- A = utilisée ailleurs ;
- M + A = utilisée dans les deux.

Les miniatures d'applications sont détectées automatiquement comme M.
Pour une autre utilisation (dans le code d'une appli, un document externe,
etc.), ouvre « Utilisations » et ajoute manuellement M ou A avec une note.

URLS FIXES
==========
2 ECO :
https://mr-tat.github.io/Mathas/?classe=2eco

Thibault :
https://mr-tat.github.io/Mathas/?classe=thibault

Lise :
https://mr-tat.github.io/Mathas/?classe=lise

Les deux URLs Partage ne sont PAS fixes : copie-les depuis la page Autres.

REMARQUE SUR L'ANCIEN PARTAGE
=============================
L'ancien ?classe=partage n'est plus utilisé.
Ses associations existantes sont copiées vers Partage Niveau 1 pendant la migration.
