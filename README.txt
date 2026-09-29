MATH'AS — PACK COMPLET
Sections Toutes / Partage + Jeux à boutons aléatoires + 2 ECO

CE PACK CONTIENT LA VERSION COHÉRENTE À INSTALLER
=================================================

1. PAGES "TOUTES" ET "PARTAGE"
-------------------------------
Elles sont maintenant séparées en :
- Niveau 1
- Niveau 2
- Niveau 3
- Autre
- Extérieur

Lors du passage du SQL, toutes les applis déjà présentes dans
"Toutes" et "Partage" sont placées automatiquement dans "Niveau 1".

Dans la page prof, chaque appli de Toutes / Partage possède un choix
de section enregistré automatiquement.

2. SECTION "JEUX"
-----------------
La double confirmation est conservée :
- "Ton prof est d'accord ?"
- puis "Tu es sûr ?"

Oui et Non ont exactement le même style.

NOUVEAU :
l'ordre de Oui et Non est tiré au hasard à CHAQUE bulle.
Donc Oui peut être à gauche ou à droite, et pareil pour Non.
Le deuxième choix est lui aussi tiré au hasard indépendamment.

Aucun bouton n'est sélectionné visuellement à l'ouverture.

3. CLASSE "2 ECO"
-----------------
Le pack conserve aussi la classe 2 ECO et son accès dans la page prof.

INSTALLATION
============

ÉTAPE A — SUPABASE
------------------
1. Ouvrir Supabase.
2. SQL Editor.
3. New query.
4. Ouvrir le fichier :
   setup_sections_toutes_partage.sql
5. Copier TOUT le contenu.
6. Coller dans Supabase.
7. Cliquer sur Run.

Ce SQL :
- autorise Jeux ;
- autorise les sections niveau1 / niveau2 / niveau3 / autre / exterieur ;
- crée 2 ECO si nécessaire ;
- met les applis déjà présentes dans Toutes / Partage en Niveau 1.

Il peut être exécuté même si certains anciens scripts ont déjà été lancés.

ÉTAPE B — GITHUB
----------------
Dans le dépôt Mathas, remplacer ces 6 fichiers :
- config.js
- app.js
- styles.css
- teacher.html
- teacher.css
- teacher.js

Puis :
- Commit changes
- attendre le déploiement GitHub Pages
- Ctrl + F5 dans le navigateur

IMPORTANT
=========
Utiliser les fichiers de CE pack ensemble pour éviter de mélanger
plusieurs anciennes versions.
