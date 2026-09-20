# Math'as — Hub connecté à Supabase

Cette version du hub charge désormais les applications depuis Supabase.

## URLs des classes

- Observation : `?classe=observation`
- Phase 1 : `?classe=phase1`
- Phase 2 : `?classe=phase2`

## Fichiers

- `index.html` : structure de la page
- `styles.css` : apparence
- `app.js` : chargement Supabase et affichage dynamique
- `config.js` : URL du projet Supabase et clé publishable

La clé publishable est destinée au navigateur. Les droits réels sont limités par RLS et les permissions SQL du projet Supabase.
