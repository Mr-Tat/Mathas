MATH'AS — CORRECTIF V2 ÉCHELLE DE L'APERÇU

Le problème venait d'une règle `height: 100%` sur la zone contenant l'image :
elle prenait la hauteur de toute la bulle au lieu de seulement l'espace restant
entre l'en-tête et les boutons. L'image était donc bien "contain", mais dans une
zone trop grande qui était ensuite masquée.

Correction :
- la bulle tient toujours entièrement dans la hauteur de l'écran ;
- l'en-tête et les 4 boutons gardent leur place ;
- l'espace restant est attribué à l'image ;
- l'image conserve son ratio et est TOUJOURS visible en entier ;
- la bulle est réellement centrée ;
- sur un écran peu haut, les marges et boutons se compactent légèrement.

À remplacer dans GitHub :
- teacher-other.html
- teacher.css

Aucun changement Supabase.
