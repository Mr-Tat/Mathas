# Math'as — Hub V1

Ce dossier contient une première version vide du hub Math'as, prête à être publiée sur GitHub Pages.

## Fichiers
- `index.html` : structure de la page
- `styles.css` : apparence et thèmes des 3 classes
- `config.js` : données temporaires ; Supabase remplacera cette partie plus tard
- `app.js` : logique du hub

## Les 3 adresses de classe
Une fois GitHub Pages activé :
- `...?classe=observation`
- `...?classe=phase1`
- `...?classe=phase2`

Chaque classe reçoit automatiquement sa couleur dominante :
- Observation : bleu/cyan sombre
- Phase 1 : violet sombre
- Phase 2 : vert sombre

## Structure de la page
1. Sélection du jour
2. Objectif
   - Calcul
   - Géométrie
   - Grandeurs
3. Dépassement
   - Calcul
   - Géométrie
   - Grandeurs
4. Révision
   - Calcul
   - Géométrie
   - Grandeurs
5. Outils

Les niveaux sont repliables. Calcul, Géométrie et Grandeurs sont aussi repliables et sont placés l'un sous l'autre.

## Important
Pour l'instant, `apps: []` dans `config.js` laisse volontairement le hub vide.
Ensuite, nous connecterons Supabase afin que les cartes d'applications se créent automatiquement sans devoir modifier le HTML à chaque ajout.
