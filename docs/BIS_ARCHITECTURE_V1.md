# Math'as BIS — Contrat d'architecture V1
Date : 23 octobre 2026. Statut : référence de construction, NON publié.
Périmètre : les vrais dépôts GitHub, sous branches BIS. Jamais le main/public sans validation explicite.

## 1. Objet et périmètre
Construire une seule architecture pérenne pour le HUB, les jeux, l'espace professeur et la projection de classe. La BIS remplacera la version publique après validation complète, sans créer un nouveau laboratoire.
Conserver les jeux et leurs règles internes. Remplacer la passerelle d'intégration expérimentale, pas les applications.
Supabase-Test : bzdflehyuowbawdzuawh. Production : jftzuslpelgzbdrftszw. Ne jamais confondre les deux.
Le prototype lab-comptes est figé comme référence, sans promotion automatique de ses essais en données officielles.

## 2. Responsabilités strictes
- HUB : entrée, identité élève, classe autorisée, choix de jeu, ticket de lancement court et à usage unique. Le HUB n'est ni le moteur de score ni un relais de parties.
- Application : exercices, règles, barème, points, records, trophées, progression, Master Mode et logique de restauration/fusion d'état.
- Passerelle Math'as unique et commune : protocole sécurisé de lancement, envoi idempotent d'un événement de fin de partie, lecture/écriture d'un état opaque versionné, queue locale bornée. Aucune règle propre aux jeux.
- Supabase : source de vérité des identités, droits, tentatives, états et publications d'affichage ; règles RLS et validation serveur.
- Page professeur : administration autorisée, requêtes ciblées de résultats et configuration de projection. Elle ne reçoit ni ne relaie les événements des jeux.
- Tableau : lecture seule d'une sélection publiée, autorisation temporaire/révocable ; aucun accès administration professeur.

## 3. Les quatre contrats
A. IDENTITÉ : authentification de l'appareil, élève permanent (id métier de mathas_students), groupe(s), session de lancement liée à l'application et aux autorisations. URL directe ou partage = mode libre, aucun envoi nominatif.
B. RÉSULTAT : événement immuable de fin de partie avec identifiant idempotent, application_id, activity_key stable, mode, niveau, score, score_max si pertinent, points si calculés par l'application, scoring_version, version du jeu et horodatage serveur. Le serveur attribue student_id et groupe à partir de la session autorisée, jamais depuis les valeurs revendiquées par le navigateur. Résultats sans authentification ou Master Mode = jamais officiels.
C. SAUVEGARDE : état opaque propre au jeu (state_data JSON), schema_version, revision et reset_epoch. Écriture seulement si modifié, compare-and-swap. Aucun calcul ni fusion de records dans le SDK, le HUB ou Supabase ; les conflits sont renvoyés à l'application.
D. RESTITUTION : jeu récupère uniquement SA sauvegarde; professeur récupère les tentatives des groupes autorisés; tableau ne reçoit qu'une publication autorisée et limitée dans le temps.

## 4. Score hebdomadaire — le tableau décidé
- Centre et élément principal : scores de la semaine.
- Gauche : scores des classes.
- Droite : meilleures évolutions.
- Coin supérieur droit : notifications de temps forts.
- Fuseau : Europe/Brussels. Période hebdomadaire déterminée côté serveur, du lundi 00:00 au lundi suivant 00:00 (borne exclusive); ne pas utiliser l'horloge cliente comme référence.
- Une tentative vaut un événement et ne remplace aucune autre tentative. Le classement est une vue, pas une table de records copiée.
- Pas de comparaison implicite entre 4/4, 6/10, Mort subite ou deux barèmes hétérogènes. Le jeu fournit les points et la famille d'activité; seules les catégories explicitement comparables sont classées ensemble.
- Les formules exactes de classement inter-jeux, score de classe et « évolution » seront confirmées avant le moteur de classement; elles ne bloquent pas la passerelle.
- Les tentatives lab/quarantined et les anciennes expériences ne sont JAMAIS incluses dans le classement officiel.
- Confidentialité : aucun nom complet en projection ; alias public autorisé ou pseudonyme. Opt-in/visibilité et suppression doivent être gérés.

## 5. Synchronisation économique et résilience
- À l'ouverture d'un jeu élève : une vérification sécurisée et une seule lecture de sauvegarde. Mode libre = aucune requête compte.
- À la fin d'une partie : un résultat idempotent; si état changé, une sauvegarde. Regrouper les opérations lorsque le serveur le permet, sans inventer un nouveau polling.
- Hors ligne : petite queue locale bornée *liée à l'élève et à l'application* ; retry avec même eventId. Ne jamais transférer une queue à un autre élève.
- Conflit d'état : revision/version/reset_epoch; le service refuse l'écrasement, l'application décide de fusionner, remplacer ou présenter un conflit.
- Ne pas refaire un état complet pour une seule préférence cosmétique. Aucun polling continu dans les jeux ; professeur actualisation à la demande, tableau cadence légère ou événement cadré.
- JS/CSS communs légers, assets WebP cacheables. Ne pas copier le HTML des jeux dans le HUB. Ne pas intercepter globalement Storage.prototype pour la BIS.

## 6. Permissions, sécurité et données
- Professeur = authentification séparée des élèves et permissions *par groupe* : gérer les élèves ≠ consulter les résultats.
- Confirmation explicite du dispositif élève; révocation par dispositif; ticket à usage unique et TTL; aucune clé service_role dans le navigateur.
- Supabase Auth anonyme d'un appareil n'est PAS la clé métier permanente de l'élève.
- Score client : plausible et attribuable à une session autorisée mais non « anti-triche » absolu; définir validation_status claire avant classement/publication.
- Master Mode = simulation sans écriture officielle de score/progression. Remise à zéro réelle = opération professorale explicite, auditée.
- Séparer test / production par configuration versionnée et sécurité côté serveur ; aucun transfert tacite des données élèves.
- Politique de conservation/export/effacement et information légale des responsables à confirmer avant comptes réels.

## 7. Contraintes de mise en production
- Développer uniquement sur bis/architecture-v1 (HUB) et bis/integration-v1 (Addition écrite simple).
- Commencer par les contrats purs + tests automatisés, puis service test / SDK / premier jeu / espace prof / tableau.
- Aucune modification de main public et aucune migration Supabase production sans revue, feu vert explicite, sauvegarde et retour arrière.
- Tests P0 : direct/libre, bon/mauvais compte, professeur hors classe, appareil révoqué, ticket rejoué/expiré, eventId répété, Master Mode, offline, deux navigateurs en conflit, reset, score non publié, projection fermée.
- Critères de sortie : tous les tests P0 satisfaits, validation réelle Brave + Chrome Rem, limites de consommation mesurées, procédure de rollback et approbation finale du professeur.

## 8. Règle STOP
Dès qu'une modification oblige le HUB à connaître les règles d'un jeu, à copier le jeu, à ajouter un second SDK, à contourner RLS, à mélanger LAB/officiel ou à patcher sans test : STOP, revue d'architecture avant de poursuivre.
