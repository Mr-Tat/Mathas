MATH'AS — V2 Toutes les applis / Partage

CORRECTIONS
-----------
- Les pages `?classe=toutes` et `?classe=partage` ne peuvent plus retomber
  silencieusement sur Observation.
- Si le SQL n'a pas été exécuté, un message d'erreur explicite sera affiché.
- Les deux pages utilisent une seule grande case contenant toutes les applis.
- Aucun bloc Sélection du jour / Objectif / Dépassement / Révision / Outils.
- Les miniatures sont environ 20 % plus grandes.
- Toutes les applis garde Dernier / Meilleur.
- Partage n'affiche aucun score.

À REMPLACER DANS GITHUB
-----------------------
- config.js
- app.js
- styles.css

IMPORTANT
---------
Le SQL `setup_toutes_partage.sql` doit avoir été exécuté dans Supabase.
Après déploiement : Ctrl + F5.
