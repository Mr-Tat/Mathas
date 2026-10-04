MATH'AS — PACK COMPLET DU 04/10/2026 — V2
======================================

Ce ZIP remplace tous les petits correctifs que je t'ai donnés depuis la
bibliothèque Images / déplacement d'images.

IL CONTIENT NOTAMMENT
---------------------
- nouveaux logos Math'as + favicon M ;
- logo élève réduit ;
- tableau GLOBAL avec lignes mieux séparées ;
- alternance de couleur des lignes + couleur au survol ;
- en-tête du tableau GLOBAL qui reste visible pendant le scroll ;
- bouton GLOBAL renommé PRINCIPAL sur la page Autres ;
- navigation principale :
    Observation / Phase 1 / Phase 2 / Toutes | Autres | Images
- Images accessible directement depuis la page principale ;
- nouvelle organisation des sections :
    * classes normales + 2 ECO : Objectif / Calculs écrits / Dépassement /
      Révision / Outils / Jeux
    * Toutes : Niveau 1 / Niveau 2 / Niveau 3 / Calculs écrits / Outils /
      Autre / Extérieur
    * Thibault / Lise / Partage 1 / Partage 2 :
      Niveau 1 / Niveau 2 / Niveau 3 / Calculs écrits / Outils / Autre
- page Autres avec boutons plus compacts et accès direct aux pages ;
- bibliothèque Images classée par dossier ;
- miniatures Images plus petites ;
- bouton Modifier pour déplacer/supprimer une image ;
- badges :
    * M bleu = Math'as
    * M violet lumineux = détectée dans une application
    * A = autre / utilisation extérieure
- bouton Détecter dans Images ;
- détail des utilisations avec titre court + URL du fichier trouvé.

IMPORTANT : SUPABASE
--------------------
Il y a en réalité DEUX modifications Supabase en attente depuis cette période :
1. les nouvelles sections Calculs écrits / Outils ;
2. la détection automatique des images.

Elles sont regroupées dans UN SEUL fichier :
    MIGRATION_UNIQUE_2026-10-04.sql

Tu ne dois PAS exécuter les anciens scripts séparés.

INSTALLATION CONSEILLÉE
-----------------------
1. Ouvre Supabase > SQL Editor > New query.
2. Ouvre MIGRATION_UNIQUE_2026-10-04.sql.
3. Copie TOUT le contenu, colle-le dans Supabase, puis clique Run.
4. Si le script termine sans erreur, va dans ton dépôt GitHub Mathas.
5. Remplace les 9 fichiers suivants par ceux de ce ZIP :
    - index.html
    - styles.css
    - config.js
    - app.js
    - teacher.html
    - teacher.css
    - teacher.js
    - teacher-other.html
    - teacher-other.js
6. Commit changes.
7. Attends le déploiement GitHub Pages.
8. Ferme les anciens onglets Math'as et rouvre la page prof.
9. Va dans Images et clique une première fois sur Détecter.

Tu peux remplacer les 9 fichiers d'un coup : ils constituent une version
cohérente entre eux.

Aucune donnée d'application n'est supprimée par la migration.
Les nouvelles sections ne déplacent pas automatiquement tes applications.

REMPLACER UNE IMAGE SANS CHANGER SON URL
----------------------------------------
Dans Images > Modifier, il y a maintenant « Remplacer l’image ».

C’est particulièrement pratique pour :
- changer un logo ;
- corriger une miniature ;
- mettre à jour une illustration utilisée à plusieurs endroits.

Le fichier est écrasé directement au même emplacement Supabase :
L’URL publique reste donc identique.

ATTENTION :
- tous les endroits qui utilisent cette URL afficheront la nouvelle image ;
- l’ancienne image est écrasée ;
- un avertissement détaillé est affiché avant validation ;
- certains navigateurs/CDN peuvent conserver l’ancienne version en cache
  pendant quelques minutes.

Pour une image qui représente toujours le même élément (par exemple le logo
Math’as), « Remplacer » est généralement plus pratique que créer une nouvelle
image et modifier toutes les URLs.
