MATH'AS — SECTION JEUX

NOUVEAU
=======
Dans les hubs élèves classiques :
- nouvelle section "Jeux", sous les autres sections ;
- elle est fermée par défaut ;
- lorsqu'un élève essaie de l'ouvrir :
  1. bulle : "Ton prof est d'accord ?" Oui / Non
  2. si Oui : bulle "Tu es sûr ?" Oui / Non
  3. seulement après le deuxième Oui, la section s'ouvre ;
- fermer Jeux est immédiat ;
- chaque nouvelle tentative d'ouverture redemande les deux confirmations.

Dans la page prof :
- "Jeux" est disponible dans le menu Niveau ;
- le changement est enregistré automatiquement comme les autres niveaux ;
- l'ancien bloc visuel "Auto" est réellement supprimé.

ÉTAPES
======
1. Supabase > SQL Editor > New query
   Copier/coller puis exécuter : setup_jeux.sql

2. GitHub : remplacer
   - app.js
   - styles.css
   - teacher.js
   - teacher.css

3. Commit changes, attendre le déploiement, puis Ctrl + F5.

Aucune application n'est déplacée automatiquement dans Jeux :
tu choisis toi-même lesquelles y mettre depuis la page prof.
