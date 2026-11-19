# ADR-0001 - Synchroniser les salons par SSE

**Statut :** accepté et implémenté ; mis à jour le 18 novembre 2026 avec le fonctionnement réel. À réévaluer avant une montée en charge.

**Date :** 7 octobre 2026.

**Décision :** actions HTTP POST et diffusion serveur-vers-navigateur avec Server-Sent Events (SSE).

## Contexte

Un salon doit montrer à tous les participants les changements de paramètres, les arrivées, les départs, le lancement et les progrès sans recharger la page. Les modifications partent du navigateur vers le serveur ; les mises à jour du salon repartent du serveur vers tous les navigateurs. Le projet est déjà en Next.js avec des Route Handlers et une base PostgreSQL locale.

## Choix retenu (décision initiale)

Les actions du joueur utilisent `/api/rooms` et `/api/rooms/[id]` en HTTP POST. Chaque navigateur ouvre `/api/rooms/[id]/events` avec son jeton de membre. Le serveur envoie une vue SSE à l'ouverture puis, environ toutes les 600 ms, relit le salon et publie une nouvelle vue si sa `revision` a changé ; sinon il envoie un commentaire de maintien de connexion. Le client se reconnecte automatiquement si le flux se coupe. Le serveur valide les permissions de l'hôte pour les réglages et le départ.

PostgreSQL conserve chaque salon dans `guepard_rooms.data` (JSONB). Les mutations sont sérialisées par une transaction et un verrou consultatif. Cela évite qu'une invitation privée à usage unique soit consommée simultanément par deux personnes.

## Fonctionnement réel actuel (mise à jour du 18 novembre 2026)

La décision est inchangée. Ce qui a été précisé à l'implémentation :

- **Lecture SSE :** boucle de 600 ms après la fin de chaque lecture, par abonné. Chaque lecture appelle `tick` : pendant la course, la grille de 250 ms avance et la révision augmente, donc une vue complète est poussée à chaque lecture ; en attente et aux résultats, seulement lors d'un changement. Messages : `data: {"room": ...}`, commentaire `: heartbeat`, `data: {"closed":true}`.
- **Authentification du flux :** le jeton passe dans l'en-tête `Authorization`, donc le client lit le flux avec `fetch` et non `EventSource`. Reconnexion après 1,5 s ; les vues de révision inférieure sont ignorées.
- **Regroupement des frappes :** le client envoie au plus une requête `progress` à la fois, toutes les 180 ms, avec la dernière saisie, le compteur de frappes et l'agrégat clavier (environ 5 requêtes par seconde au plus par joueur, sous le plafond de 10 de PERF-02). Il n'y a pas d'écriture en base par frappe, mais le salon modifié est réécrit à chaque requête acceptée. Un battement de présence part toutes les 15 s.
- **Validation serveur :** budget de 25 caractères par seconde (8 initiaux, 40 au plus), cohérence de l'agrégat clavier, préfixe correct en mode correction obligatoire.
- **Bots :** simulés côté serveur sur une grille de 250 ms rejouée depuis une graine, indépendante de la cadence de lecture ([ADR-0002](adr-0002-bots.md)). Les bonus et les échantillons MPM suivent la même grille.
- **Absence :** 30 s sans présence en course entraînent l'abandon.

Flux détaillé, liste des événements et des actions : [ARCHITECTURE.md](../ARCHITECTURE.md).

## Pourquoi ce choix

SSE correspond au besoin principal de diffusion **du serveur vers les clients** tout en gardant les mutations en POST. Il demande moins de protocole applicatif qu'un WebSocket bidirectionnel pour le fonctionnement actuel et permet d'utiliser les Route Handlers existants. Par rapport à un simple sondage du navigateur, le flux garde une connexion et n'oblige pas chaque composant à gérer son propre intervalle de requêtes.

## Solutions écartées pour ce jalon

| Option | Raison |
| --- | --- |
| WebSocket | Plus flexible pour un échange bidirectionnel permanent, mais infrastructure et gestion de connexion supplémentaires pour ce prototype. |
| Sondage HTTP côté navigateur | Simple au départ, mais multiplie les requêtes et rend la mise à jour de plusieurs clients moins cohérente. |
| Service temps réel externe | Ajoute une dépendance, une configuration et des coûts avant de mesurer la charge réelle. |

## Conséquences et limites

- Les données du salon restent autoritaires côté serveur ; le client n'écrit pas directement dans PostgreSQL.
- Le flux SSE et la vérification des jetons doivent tourner sur un serveur Node qui accepte des connexions longues. Les limites d'une plateforme d'hébergement doivent être vérifiées avant le déploiement.
- La lecture répétée du salon, son stockage JSONB et le verrou global sont simples mais peuvent limiter la montée en charge : chaque transaction relit toutes les lignes de `guepard_rooms` sous un verrou consultatif global. Les tests fonctionnels couvrent une classe d'environ 30 personnes ; ils ne remplacent pas un test de performance multi-salons.
- Avant une production à plus grande échelle : mesurer la latence et les connexions, envisager des lignes par salon/participant et une diffusion par pub/sub. Ne pas présenter le choix actuel comme une architecture déjà éprouvée à grande échelle.

**Révision prévue (initiale) :** après les premiers tests de classe et avant la mise en ligne publique.

Sources : [`events/route.ts`](../../app/api/rooms/%5Bid%5D/events/route.ts), [`room-client.ts`](../../src/lib/room-client.ts), [`room-store.ts`](../../src/server/room-store.ts).
