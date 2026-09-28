MATH'AS — FIX JEUX + NOUVELLE CLASSE 2 ECO

1) BUG "JEUX"
=============
Le front-end savait déjà afficher "Jeux".
Le problème le plus probable est Supabase : l'ancienne contrainte de la
colonne `niveau` refusait encore la valeur `jeux`.

Le nouveau SQL la remplace de façon robuste et autorise :
- objectif
- depassement
- revision
- outil
- jeux

2) CLASSE 2 ECO
===============
Nouvelle URL élève :
https://mr-tat.github.io/Mathas/?classe=2eco

Elle fonctionne comme Observation / Phase 1 / Phase 2 :
- Sélection du jour
- Objectif
- Dépassement
- Révision
- Outils
- Jeux

Toutes les applications générales existantes sont ajoutées à 2 ECO,
mais INVISIBLES par défaut. Tu choisis ensuite lesquelles afficher
depuis la page prof.

Les futures applications générales seront automatiquement créées pour
2 ECO aussi, car la page prof crée déjà les liens pour toutes les classes
sauf Partage.

3) PAGE PROF
============
Ajout :
- raccourci "2 ECO"
- onglet de réglage "2 ECO"

Les 6 raccourcis sont de largeur égale.

INSTALLATION
============
A. Supabase
-----------
Ouvrir `setup_fix_jeux_et_2eco.sql`, copier tout dans :
Supabase > SQL Editor > New query
puis Run.

B. GitHub
---------
Remplacer :
- config.js
- app.js
- styles.css
- teacher.html
- teacher.css
- teacher.js

Puis Commit changes, attendre le déploiement et faire Ctrl + F5.
