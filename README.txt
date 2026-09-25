MATH'AS — PARTAGE INDÉPENDANT + 6 CARTES PAR LIGNE

CE QUI CHANGE
=============

1. Toutes les applis / Partage
------------------------------
La grande case est élargie.
Sur un écran suffisamment large, elle affiche 6 applications côte à côte.

2. Partage devient indépendant
-------------------------------
La page Partage ne reprend plus automatiquement les applications de Math’as.

Dans la page prof > Partage, deux nouveaux boutons apparaissent :

+ Ajouter appli existante
- permet de choisir une application déjà présente dans Math’as ;
- elle est ajoutée seulement à Partage ;
- les autres pages ne sont pas modifiées.

+ Ajouter appli spécifique
- crée une nouvelle application réservée à Partage ;
- elle n'est ajoutée ni à Observation, ni à Phase 1, ni à Phase 2,
  ni à Toutes les applis ;
- elle porte le marqueur `partage_uniquement = true`.

Dans Partage :
- une appli générale peut être "Retirée" de Partage sans être supprimée de Math’as ;
- une appli spécifique peut être supprimée définitivement.

3. Nouvelles applications générales
------------------------------------
Le bouton normal "+ Ajouter une appli" :
- crée l'appli dans Observation / Phase 1 / Phase 2 / Toutes ;
- ne l'ajoute plus automatiquement à Partage.

ÉTAPES
======

A. Supabase
-----------
Exécuter UNE FOIS :
setup_partage_independant.sql

Attention :
ce script vide volontairement la page Partage actuelle afin de repartir
avec le nouveau fonctionnement explicite.

B. GitHub
---------
Remplacer :
- styles.css
- teacher.html
- teacher.css
- teacher.js

Aucun changement de config.js ou app.js n'est nécessaire pour cette évolution.

Puis :
Commit changes > attendre le déploiement > Ctrl + F5.
