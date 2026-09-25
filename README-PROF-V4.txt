MATH'AS — PAGE PROF V4 : MINIATURES PAR GLISSER-DEPOSER

Le bucket Supabase utilisé est :
mathas-images

Le dossier créé automatiquement pour les miniatures est :
miniatures/

CE QUI CHANGE
-------------
Dans "+ Ajouter une appli" et "Modifier" :
- glisser-déposer d'une image ;
- ou clic pour choisir un fichier ;
- aperçu immédiat ;
- envoi automatique dans Supabase Storage au moment d'Enregistrer ;
- récupération automatique de l'URL publique ;
- association automatique à applications.miniature_url ;
- bouton Copier l'URL ;
- les anciennes miniatures GitHub restent compatibles.

Lors du remplacement d'une miniature :
- la nouvelle image est envoyée ;
- l'appli est mise à jour ;
- si l'ancienne miniature était dans mathas-images, l'ancien fichier est
  nettoyé automatiquement.

Lors de "Supprimer partout" :
- si la miniature appartient à mathas-images, elle est également supprimée
  du Storage.
- une ancienne miniature hébergée sur GitHub n'est évidemment pas supprimée.

SECURITE
--------
Les policies Storage ont déjà été ajoutées dans Supabase.
Aucun SQL supplémentaire n'est nécessaire pour cette version.

GITHUB
------
Remplacer seulement :
- teacher.html
- teacher.css
- teacher.js

Puis Commit changes, attendre GitHub Pages et faire Ctrl + F5.
