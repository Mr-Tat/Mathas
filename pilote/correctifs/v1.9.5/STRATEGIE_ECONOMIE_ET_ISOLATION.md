# Math'as Lab V1.9.5 — séparation + économie des échanges

> Branche **test** uniquement : `feature/comptes-eleves-prototype-20261021`.
> Aucun déploiement sur `main` ou Supabase production.

## Isolation des données

- Le navigateur garde le **jeu libre** sur ses clés locales historiques.
- Le **jeu de classe** reçoit un espace de stockage local distinct par ID élève (`mathas:class:v195:<student_id>:`). Le module `class-storage-partition.js` est injecté avant les scripts du jeu, sur la copie locale testée uniquement.
- La session vérifiée côté serveur demeure indispensable. Un ID dans l’URL n’est qu’un indice d’espace local, **jamais une autorisation**.
- Les identifiants Auth/Supabase locaux restent hors de cette séparation.
- Aucune donnée issue du mode libre n’est importée dans la progression ou les records du mode classe.
- L’association du navigateur à un élève demeure explicite. La réattribution et la révocation sur ordinateur partagé restent à renforcer avant production.
- Les données historiques V1.9.4 du jeu de classe dans les anciennes clés locales ne sont **pas importées automatiquement** : les acquis confirmés sont récupérés depuis Mathas-Test.

## Budget Supabase

- Une lecture des états à l’ouverture d’une session de classe autorisée.
- À l’état de repos, lecture périodique **au plus toutes les ~120 secondes**, uniquement quand l’onglet est visible et au menu. Le minuteur local ne déclenche aucune requête lorsqu’il n’y a pas de lecture utile.
- Au retour sur l’onglet : lecture uniquement si le dernier rafraîchissement remonte à plus de 30 secondes.
- Après une partie terminée : synchronisation différée pour enregistrer points/trophées ; deuxième passage uniquement si l’état local a réellement changé.
- Aucune écriture d’état si la version fusionnée est identique à celle déjà présente dans Supabase.
- Identité élève approuvée mise en cache pour la **page courante** afin d’éliminer les demandes simultanées en double ; chaque écriture demeure revalidée par l’Edge Function.
- Hors ligne : aucune demande réseau ; en cas de panne, tentatives espacées 15, 30, 60 secondes… jusqu’à cinq minutes ; reprise au retour du réseau.
- Les scores ne sont envoyés qu’après une partie scolaire terminée (pas à chaque touche ni calcul intermédiaire).
- Éléments encore à optimiser avant plusieurs classes simultanées : regroupement des événements, taille des payloads, pagination côté professeur, limites/quotas et suivi des volumes mesurés.

## Budget GitHub

- Un seul téléchargement ZIP de la branche du vrai jeu lors de la première installation **dans un dossier de kit** ; pas de nouveau téléchargement GitHub à chaque exercice.
- Images et scripts locaux ensuite servis par `localhost`. Aucune action GitHub déclenchée par un élève.
- Les modifications restent petites et ciblées sur les branches de test, sans republier les images inutilement.
- En production, maintenir la compression déjà acquise des images et utiliser le cache statique approprié.

## Validation

- Tests de fonctions JS isolés en environnement Node : scores libres conservés, séparation classe A/B, conservation des sessions au rechargement, effacement limité au compte et état Auth préservé.
- Contrôle d’échanges : quatre appels simultanés/répétés à l’identification dans une page => un seul appel réseau.
- Vérification de la syntaxe JS et de l’archive ZIP.
- Test complet Windows/Chrome avec serveur Supabase : **à effectuer** ; les tests de navigateur automatisés locaux ne sont pas possibles dans cet environnement.
- Ceci reste un LAB ; rien n’homologue un résultat remonté par le navigateur. La sécurité, les remises à zéro et les collisions de synchronisation nécessitent des travaux avant le déploiement public.
