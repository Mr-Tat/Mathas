MATH'AS — ÉCHELLE DE L'APERÇU + FAVICON HUB DISTINCT

1. APERÇU DES IMAGES
--------------------
Dans la grande bulle, l'image utilise maintenant object-fit: contain :
- elle est toujours affichée entièrement ;
- elle est centrée ;
- elle ne peut plus être coupée par le bas ou par les boutons.

2. ICÔNE DES ONGLETS
--------------------
Un nouveau fichier `favicon-hub.png` est fourni.

Il reprend le vrai M Math'as, entouré d'un cercle bleu sombre avec un
contour violet lumineux.

Ce favicon est utilisé uniquement par les pages du HUB Math'as :
- index.html
- teacher.html
- teacher-other.html

Les applications séparées ne sont PAS modifiées : elles peuvent donc garder
le simple M. Cela permet de distinguer visuellement dans les onglets :
- M entouré de violet = page/hub Math'as
- M simple = application

C'est une pratique normale : chaque site/page peut déclarer son propre favicon.

À remplacer / ajouter dans GitHub Mathas :
- index.html
- teacher.html
- teacher-other.html
- teacher-other.js
- teacher.css
- favicon-hub.png

Aucun changement Supabase.
