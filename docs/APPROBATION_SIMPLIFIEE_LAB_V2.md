# Math'as — Validation professeur simplifiée (étape suivante, LABORATOIRE)

**État au 21 octobre 2026 : spécification, NON DÉPLOYÉE.**

Le pilote validé utilise encore un code à **6 chiffres**, saisi manuellement.
Mathas-Test contient des élèves fictifs et des scores de laboratoire qu'il faut conserver.

## Comportement demandé
- Une nouvelle demande affiche un **code à 4 chiffres** sur la page élève.
- Seul le professeur **authentifié et autorisé** reçoit la liste des demandes, accompagnées d'un code affiché automatiquement pour chaque demande.
- Le professeur compare visuellement le code de l'élève et celui de la demande sélectionnée; il coche « Les codes correspondent » puis clique « Confirmer et autoriser ».
- Le prénom commence par une majuscule; l'initiale du nom est majuscule.
- Une deuxième autorisation avec le même identifiant récupère le même **student_id** permanent; scores et historique restent inchangés.

## Conditions indispensables côté serveur
- Même code côté élève/professeur, généré et vérifié **uniquement côté serveur**; jamais exposer une clé serveur ou la clé de signature dans le navigateur.
- Identifiant de demande aléatoire, code lié à la demande et expirant au bout de 10 minutes.
- Limitation des demandes, nombre de vérifications limité, approbation SQL atomique et vérification du statut professeur sur chaque action.
- Le code préaffiché ne constitue pas à lui seul une preuve d'identité. Le professeur confirme visuellement face à l'élève.
- Retourner les codes **uniquement** via l'action authentifiée teacher_requests; ne pas les inclure dans un endpoint élève ou public.
- Ne jamais autoriser via un paramètre URL ou une simple déclaration « professeur » depuis le client.
- Tester les scénarios de refus, expiration, erreur de code, double validation, révocation et deuxième appareil.
- Nouveau code : valider d'abord la transition d'anciennes demandes 6 chiffres à la version 4 chiffres, en conservant les élèves et leurs scores.

## Mise en production interdite à cette étape
- Les changements serveur concernent exclusivement Supabase **Mathas-Test** (bzdflehyuowbawdzuawh).
- GitHub : branche **feature/comptes-eleves-prototype-20261021** uniquement.
- Le HUB Math'as public et le projet Supabase principal restent inchangés.

## État technique
Le serveur d'autorisation 4 chiffres n'a pas pu être publié lors des tentatives d'octobre 2026. Ne jamais afficher « disponible » ou activer une interface à 4 chiffres tant que le serveur réel reste à 6 chiffres.
