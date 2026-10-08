# GUÉPARD - Matrice des exigences du checkpoint 1

**Date :** 7 octobre 2026. **Portée :** exigences de la grille transmise et parcours du prototype. « Implémenté » décrit le dépôt ; « vérifié » décrit les tests disponibles. Un lien local n'est pas une preuve de déploiement public.

| ID | Exigence | Preuve dans le dépôt | État |
| --- | --- | --- | --- |
| DA-01 | Nom, logo, palette, typographies | [Direction artistique](../design/direction-artistique.md), [logo](../../public/assets/guepard-logo.png), `src/style.css` | Documenté |
| DA-02 | Moodboard et origine de la démarche | [Moodboard PDF](../design/moodboard.pdf), [direction artistique](../design/direction-artistique.md) | Documenté ; évolutif |
| ARCH-01 | Modèle de données | [Schéma](../architecture/schema-donnees.md), `src/lib/room-types.ts` | Documenté et implémenté |
| ARCH-02 | Machine à états | [Diagramme](../architecture/machine-etats.md), `src/server/room-engine.ts` | Documenté et implémenté |
| ARCH-03 | Décision sur le temps réel | [ADR-0001](../architecture/adr-0001-temps-reel-sse.md), `app/api/rooms/[id]/events/route.ts` | Documenté et implémenté |
| DEP-01 | Site accessible publiquement en HTTPS | [Fichier de remise](../../CHECKPOINT-1.md) | **À faire** : lien public absent |
| DEP-02 | Authentification sur le site déployé | `app/api/auth/route.ts`, `src/server/auth-store.ts`, `tests/e2e/auth.spec.ts` | Fonctionne en local ; **à vérifier après déploiement** |
| DEP-03 | Base de données de production | `compose.yaml`, `.env.example`, `src/server/room-store.ts` | PostgreSQL local ; **base hébergée à prévoir** |
| SAL-01 | Créer un salon public, semi-public ou privé | `src/server/room-engine.ts`, `src/components/lobby/CreateRoom.tsx` | Implémenté et testé |
| SAL-02 | Rejoindre un salon semi-public par code | `src/server/room-engine.ts`, `tests/room-engine.test.tsx` | Implémenté et testé |
| SAL-03 | Invitation privée à usage unique | `src/server/room-engine.ts`, `tests/e2e/lobby.spec.ts` | Implémenté et testé |
| SAL-04 | Mise à jour du salon en temps réel | `app/api/rooms/[id]/events/route.ts`, `src/lib/room-client.ts`, `tests/e2e/lobby.spec.ts` | Implémenté et testé localement |
| SAL-05 | Permissions hôte/participant | `src/server/room-engine.ts`, `tests/room-engine.test.tsx` | Implémenté et testé |
| JEU-01 | Départ commun, pistes et saisie | `src/components/lobby/VisualRace.tsx`, `tests/e2e/visual-race.spec.ts` | Implémenté et testé |
| JEU-02 | Progression des bots indépendante de la frappe humaine | `src/server/room-engine.ts`, `tests/e2e/visual-race.spec.ts` | Implémenté et testé |
| JEU-03 | Résultats, podium et revanche | `src/components/lobby/RaceResults.tsx`, `tests/e2e/results.spec.ts` | Implémenté et testé |
| UX-01 | Langue FR/EN | `src/i18n.ts`, `src/components/Chrome.tsx` | Présent, mais **traduction incomplète** dans certains écrans de salon |
| UX-02 | Thème jour/nuit et réduction des animations | `src/jungle.css`, `src/play-experience.css`, `tests/e2e/how.spec.ts` | Implémenté et testé sur les parcours couverts |
| QUAL-01 | Tests, types et compilation | `npm test`, `npm run typecheck`, `npm run build`, `tests/e2e/` | Vérifié localement : 26 tests unitaires, 14 parcours navigateur, typage et build réussis |
| QUAL-02 | Intégration continue | [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | Configurée ; **résultat GitHub Actions à confirmer** |
| DOC-01 | Dépôt clonable et fichier de remise | [README](../../README.md), [CHECKPOINT-1](../../CHECKPOINT-1.md) | Dépôt disponible ; **lien de site public manquant** |

## Points bloquants pour dire « tout est OK »

1. Mettre le site en ligne avec HTTPS et une base PostgreSQL hébergée ; vérifier inscription, connexion, salon par code et flux SSE sur cette adresse.
2. Ajouter le vrai lien public au fichier de remise et supprimer son texte de brouillon.
3. Vérifier le premier passage de la CI sur GitHub Actions. Une configuration versionnée n'est pas encore une exécution réussie.
4. Finir les traductions FR/EN dans les écrans de salon si la grille attend une application entièrement bilingue.
