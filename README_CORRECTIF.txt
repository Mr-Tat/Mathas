MATH'AS — CORRECTIF REFONTE V2

Ce correctif répare les problèmes visuels observés juste après la grosse refonte.

CORRIGÉ
=======
- les cartes 2 ECO / Partage / Thibault / Lise / Images ne sont plus des
  boutons blancs collés ;
- les miniatures d'applications ne peuvent plus devenir gigantesques ;
- les fichiers CSS et JS sont maintenant appelés avec une version dans l'URL,
  pour empêcher le navigateur/GitHub Pages de mélanger ancienne et nouvelle
  version ;
- si une erreur JavaScript se produit, la page affiche désormais l'erreur
  au lieu de pouvoir rester silencieusement sur "Chargement…".

À FAIRE
=======
Dans le dépôt GitHub Mathas, remplacer UNIQUEMENT ces 5 fichiers :

- teacher.html
- teacher-other.html
- teacher.js
- teacher-other.js
- teacher.css

Puis :
1. Commit changes
2. attendre environ 1 minute
3. fermer les onglets de la page prof
4. rouvrir teacher.html

AUCUN changement Supabase n'est nécessaire.
Ne relance pas la migration SQL pour ce correctif.
