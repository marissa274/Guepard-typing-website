# Course à 30 joueurs simultanés : mesures

Exigences visées : COURSE-05 (fluidité de la piste), PERF-02 (écriture des progressions), PERF-03 (capacité de trente joueurs).
Mesuré le 20 novembre 2026 sur la branche `worktree-agent-a56b5137eaa21b84c`.

## Machine et environnement

| Élément | Valeur |
| --- | --- |
| Machine | MacBook Pro, Intel Core i9-9980HK 2,4 GHz, 16 threads, 64 Go, macOS (Darwin 25.5) |
| Node | v24.22.1 |
| Serveur | `next build --webpack` puis `next start` en `NODE_ENV=production`, 127.0.0.1:5190, un seul processus |
| Base | PostgreSQL (conteneur Docker local), base dédiée `guepard_load`, migrations et seed du projet appliqués |
| Navigateur | Chromium « Chrome for Testing » 1248, headless, fenêtre 1440 x 1050 |
| Réseau | boucle locale : client, serveur et base sur la même machine |

Le serveur de test doit recevoir `AUTH_SECRET` (sessions invitées signées) et `APP_URL=http://127.0.0.1:5190` ; sans `APP_URL`, `next start -H 127.0.0.1` voit une origine `localhost` et la protection d'origine renvoie 403 aux requêtes du navigateur.

## Méthode

Script : `tests/load/race-30.spec.ts`, configuration `playwright.load.config.ts`, commande `npm run test:load`. Ce test n'est exécuté ni par `npm test` (Jest ne lit que `*.test.tsx`), ni par `npm run test:e2e` (dossier `tests/e2e`), ni par la CI.

1. 30 comptes réels sont créés (`POST /api/auth`, inscription).
2. L'hôte crée un salon public, règle la capacité à 30, un texte personnalisé de 329 caractères, 120 s de limite, sans bonus.
3. Les 29 autres joueurs rejoignent. Chaque joueur HTTP ouvre son flux SSE `/api/rooms/:id/events`.
4. L'hôte lance la course ; après le compte à rebours serveur de 3 s, les 30 tapent en même temps.
5. Vitesse : environ 110 ms par caractère, avec un facteur propre à chaque joueur (100 à 135 ms) et une gigue de plus ou moins 20 % par frappe. Les joueurs HTTP envoient un lot cumulatif toutes les 180 ms (comme `VisualRace.tsx`), sans chevauchement : la requête suivante attend la réponse. La règle anti-triche n'a rejeté aucune requête.
6. Fin : lecture du salon, vérification de la cohérence, lecture de `/api/results` de chacun des 30 comptes.

Choix d'architecture : 29 joueurs pilotés par HTTP et SSE, plus 1 vrai navigateur Chromium qui est le 30e joueur (il tape réellement dans le champ de saisie) et l'observateur de la fluidité. Trente navigateurs mesureraient surtout la saturation de la machine de test (CPU de rendu) et non le serveur ; ici le serveur reçoit les mêmes requêtes qu'avec des navigateurs (mêmes lots, même flux SSE), et le rendu réel de la piste à 30 couloirs est mesuré sur un vrai client.

Définition des mesures :
- latence des requêtes de progression : durée aller-retour mesurée par le client sur la boucle locale (le trajet réseau est négligeable, donc très proche du temps serveur) ; p50, p95, max sur les requêtes réussies ;
- délai SSE : du début de l'envoi d'une frappe par le joueur i jusqu'à la première réception de cette progression (ou d'une valeur supérieure) par le flux SSE du joueur i+1 ;
- fluidité : `requestAnimationFrame` dans la page pendant toute la course (images par seconde, durée d'image) et `PerformanceObserver` de type `longtask` (tâches de plus de 50 ms) ;
- CPU et mémoire du processus `next start`, échantillonnés chaque seconde avec `ps`.

## Résultats (30 joueurs, deux exécutions)

| Mesure | Exécution A | Exécution B |
| --- | --- | --- |
| Durée de la course | 51,9 s | 46,9 s |
| Requêtes de progression (total, dont navigateur) | 1158 (38) | 941 (31) |
| Latence progression, p50 | 979 ms | 1149 ms |
| Latence progression, p95 | 1604 ms | 1990 ms |
| Latence progression, max | 1846 ms | 2460 ms |
| Latence progression vue du navigateur, p50 / p95 | 936 / 1709 ms | 1160 / 2024 ms |
| Délai frappe vers réception SSE, p50 | 1887 ms | 2245 ms |
| Délai frappe vers réception SSE, p95 | 3325 ms | 3930 ms |
| Délai frappe vers réception SSE, max | 4767 ms | 5824 ms |
| Piste du navigateur observateur, images par seconde | 59,8 | 59,7 |
| Image la plus longue / images de plus de 50 ms | 83 ms / 1 | 100 ms / 2 |
| Longues tâches (plus de 50 ms) | 0 | 0 |
| Réponses 2xx / 4xx / 5xx | 1158 / 0 / 0 | 941 / 0 / 0 |
| Déconnexions SSE (29 flux) | 0 | 0 |
| Joueurs avec un résultat (terminé, 329/329) | 30 / 30 | 30 / 30 |
| Classement cohérent avec les heures d'arrivée | oui | oui |
| Résultats persistés (un par compte) | 30 / 30 | 30 / 30 |
| Couloirs affichés par le navigateur | 30 | 30 |
| CPU `next start`, médiane / max | 50 % / 82 % | 46 % / 76 % |
| Mémoire `next start`, max | 331 Mo | 388 Mo |

Point de comparaison (10 joueurs, même script, `LOAD_PLAYERS=10`) : progression p50 157 ms, p95 496 ms, max 773 ms ; délai SSE p50 631 ms, p95 1172 ms ; 59,8 images par seconde ; 0 erreur.

## Lecture

- Fluidité de la piste (COURSE-05) : 60 images par seconde, aucune longue tâche avec 30 couloirs animés. Le rendu côté client n'est pas le facteur limitant.
- Fiabilité : aucune erreur 4xx, 5xx ni déconnexion SSE ; les 30 résultats et le classement sont corrects et persistés.
- Latence serveur (PERF-02) : sous 30 joueurs, la progression met environ 1 s (p50) à 2 s (p95), contre 0,16 s à 10 joueurs. Comme chaque joueur attend la réponse avant d'envoyer le lot suivant, le débit réel est d'environ 20 à 22 requêtes par seconde, bien en deçà des 165 par seconde théoriques (30 joueurs toutes les 180 ms) : le serveur est saturé, pas les clients. Aucune frappe n'est perdue (les lots sont cumulatifs), mais les autres joueurs voient la progression avec environ 2 s de retard (p50) et jusqu'à 5 à 6 s.
- Cause probable, lue dans `src/server/room-store.ts` (non profilée) : chaque transaction (écriture de progression, mais aussi chaque lecture issue du flux SSE, toutes les 600 ms par joueur) prend le verrou consultatif global 74120931, relit toute la table `guepard_rooms` et passe par une file unique dans le processus. Le coût croît avec le nombre de joueurs et toutes les salles se font concurrence. Pistes, hors périmètre de cette mesure : verrou et lecture par salle, un seul sondage de lecture par salle partagé entre les flux SSE du processus, cache de la dernière version de la salle.

Aucun bug fonctionnel n'est apparu sous charge, donc aucun correctif de code n'accompagne cette mesure.

## Limites

- Mesuré en local (client, serveur et base sur la même machine, qui se partagent donc les 16 threads), pas sur Railway : réseau, CPU alloué et latence de la base y seront différents ; les valeurs absolues ne sont pas transposables, la tendance l'est.
- Une seule salle active ; la contention globale de la table des salles serait plus forte avec plusieurs salles simultanées.
- 29 joueurs sur 30 sont simulés en HTTP et SSE, pas en navigateurs ; le délai SSE est mesuré entre clients HTTP, le navigateur n'est mesuré que pour sa propre latence de progression et sa fluidité.
- Texte personnalisé de 329 caractères, sans bonus ni erreurs de frappe ; deux exécutions de 30 joueurs seulement (variation visible entre A et B).
- La frappe du navigateur est cadencée par Playwright, pas par un humain.

## Relancer

```bash
# 1. base dédiée, créée au préalable (migrations et seed du projet)
export DATABASE_URL='postgresql://USER:MOT_DE_PASSE@127.0.0.1:PORT/guepard_load'
npm run db:migrate:sql && npm run db:seed

# 2. build et serveur de production sur un port libre
npm run build
AUTH_SECRET='une-valeur-longue-aleatoire' APP_URL=http://127.0.0.1:5190 NODE_ENV=production npx next start -p 5190 -H 127.0.0.1 &

# 3. test de charge
npm run test:load
```

Variables : `LOAD_BASE_URL` (défaut `http://127.0.0.1:5190`), `LOAD_PLAYERS` (défaut 30), `LOAD_MS_PER_CHAR` (défaut 110), `LOAD_SERVER_PID` (sinon détecté par `lsof` sur le port), `PLAYWRIGHT_CHROME_PATH`. Le JSON détaillé est écrit dans `test-results/load/race-30.json`. Le test échoue s'il y a une erreur 4xx/5xx, une déconnexion SSE, un joueur sans résultat, un classement incohérent ou un résultat non persisté ; il ne pose pas de seuil de latence.
