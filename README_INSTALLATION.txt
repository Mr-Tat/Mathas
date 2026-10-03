MATH'AS — BRANDING + BIBLIOTHÈQUE D'IMAGES + AUTRES

NOUVEAU LOGO
=============
Le M est utilisé comme favicon des pages Math'as.
Le mot Math'as illustré remplace le simple texte en haut :
- des pages élèves / Toutes / Partage ;
- du panneau enseignant ;
- de la page Autres.

URLs utilisées :
M : https://jftzuslpelgzbdrftszw.supabase.co/storage/v1/object/public/mathas-images/logos/lettre-m-3d-de-mathematiques-en-collage-1791015091641-1oed9jb.png
Math'as : https://jftzuslpelgzbdrftszw.supabase.co/storage/v1/object/public/mathas-images/logos/logo-3d-mathematiques-colore-1791015093060-1256uhr.png

AUTRES
======
- Partage Niveau 1 devient « Partage 1 »
- Partage Niveau 2 devient « Partage 2 »
- 2 ECO, Partage 1, Partage 2, Thibault, Lise et Images ont maintenant
  chacun une couleur différente.

BARRE DE SÉPARATION
===================
La bande décorée a été remplacée par une bande unie à dégradé
bleu → mauve sombre → bleu.

IMAGES
======
- Les cartes de la galerie sont environ 40 % plus petites.
- « Supprimer » est remplacé par « Modifier ».
- Modifier permet :
  * de déplacer l'image dans un autre dossier ;
  * de supprimer l'image.
- Si l'image est une miniature d'application Math'as, son URL est mise
  à jour automatiquement après déplacement.
- Les utilisations manuelles M/A suivent le nouveau chemin.
- Si une utilisation manuelle existe, un avertissement rappelle que
  l'URL extérieure peut devoir être corrigée.
- Les deux nouveaux logos du site sont automatiquement marqués d'un badge M.
- Les deux logos utilisés directement par le site ne peuvent pas être déplacés
  depuis l'interface, pour éviter de casser les en-têtes/favicons.

INSTALLATION
============
Dans le dépôt GitHub Mathas, remplacer :
- index.html
- styles.css
- teacher.html
- teacher-other.html
- teacher.css
- teacher-other.js

Les fichiers app.js, config.js et teacher.js sont fournis dans le ZIP
uniquement pour garder un pack cohérent, mais ils n'ont pas besoin d'être
remplacés si tu utilises déjà la dernière version.

Aucun changement Supabase n'est nécessaire.
