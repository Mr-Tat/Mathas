# Math’as-Test — synchronisation automatique V1.8 (laboratoire)

**Branche de développement uniquement. Aucune modification de `main`.**

## Validations précédentes

Dans Addition écrite simple, Juju a confirmé sur deux sessions élèves la récupération des résultats 4/4 et 10/10, le déblocage du niveau 2, les records et les points 20 et 65. Ces résultats sont conservés dans le projet de test `bzdflehyuowbawdzuawh`.

## Évolution V1.8

L’archive autonome `MATHAS_LAB_SYNCHRO_AUTO_V1_8_2026-10-21.zip` contient le script exécutable `progression-scolaire-lab.js` (source de référence V1.8). Le script reste **extérieur au site de production** et s’injecte dans une copie locale de la branche de test de `Addition-ecrite-simple`.

Comportement attendu :
- Nouveau navigateur : demande une seule confirmation **Associer ce navigateur au profil Juju** avant d’envoyer les anciennes données locales. Refuse automatiquement de réassocier un navigateur déjà marqué pour un autre élève.
- Par la suite, lecture et fusion des acquis à l’ouverture et au retour sur la page, toutes les ~18 secondes lorsque nécessaire, et après chaque partie.
- Si des changements arrivent d’un autre appareil, ne recharger le menu qu’en dehors d’un exercice.
- Suspendre l’envoi et la récupération tant que `window.__masterMode===true`.
- Fusion monotone (maximum des records, union des trophées, des déblocages et des trois meilleurs scores), avec vérification des modifications avant `upsert`, pour limiter les écritures inutiles.
- Échec réseau : conserver la sauvegarde locale. Aucun secret `service_role` côté navigateur.

## Limites avant un déploiement officiel

1. Ce laboratoire utilise la **session appareil autorisée** sur localhost, pas encore le ticket de lancement **HUB classe** validé par le serveur.
2. Les scores et récompenses synchronisés proviennent du navigateur, restent **non vérifiés**, et ne doivent alimenter aucun classement ni certification de trophées.
3. Deux écritures simultanées peuvent encore se concurrencer : prévoir fusion transactionnelle côté serveur, contrôle de révision et événements idempotents.
4. La fusion monotone ne gère pas les remises à zéro : prévoir des `reset_epoch` distincts pour les scores, les médailles/trophées et la progression.
5. La confirmation d’identité est **par navigateur**, pas par dossier de connexion Windows. Prévoir une séparation par élève et par session de classe pour le cas des ordinateurs partagés.
6. Déployer après audits des règles RLS, des identités autorisées, des lancements valides, des coûts et des permissions des enseignants.

**Aucune modification du Supabase principal n'est permise à ce stade.**

## Vérifications de développement

- Archive ZIP et contrôles statiques JS.
- Tests Node simulés : appareil refusé, association unique, Master Mode actif, stockage sans boucle d’écriture.
- Test de bout en bout sur les navigateurs Windows du professeur à effectuer avant de considérer V1.8 comme validée.
