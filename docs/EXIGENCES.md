# Guépard — matrice de traçabilité

État du dépôt au 18 novembre 2026, à partir du cahier des charges « Web V — Travail de session ». Cette matrice décrit les fonctionnalités présentes et les écarts connus ; elle ne certifie pas le déploiement public ni l'exécution de GitHub Actions.

**Statuts :** `complet` signifie que l'exigence décrite est implémentée et dispose de vérifications adaptées ; `partiel` signifie qu'au moins un point manque ou reste à vérifier ; `non fait` signifie que la fonctionnalité demandée n'est pas implémentée. Les tests cités sont des fichiers de preuve ; leur présence seule n'atteste pas leur dernier résultat. Le bilan de vérification de la tranche courante figure à la fin.

## Contraintes techniques

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| TECH-01 | complet | `package.json`, `app/` | Compilation Next.js | Next.js 16.4.6, App Router et React ; compilation de production vérifiée. |
| TECH-02 | complet | `tsconfig.json`, `src/`, `scripts/` | `npm run typecheck` | TypeScript strict activé ; ESLint interdit les any explicites. Lint et typage passent. |
| TECH-03 | complet | `app/globals.css`, `postcss.config.json`, `package.json` | Compilation | Tailwind CSS intégré ; des styles CSS existants restent utilisés. |
| TECH-04 | complet | `migrations/`, `scripts/db-migrate.ts`, `scripts/db-seed.ts`, `src/server/db-schema.ts` | Migrations/seed idempotents, E2E PostgreSQL | Trois migrations SQL versionnées avec checksums ; seed idempotent corpus, compte et historique. Corpus interrogé via Drizzle ; transactions explicites avec pg. |
| TECH-05 | non fait | `docs/deploiement-railway.md`, `CHECKPOINT-1.md` | Aucun contrôle public réalisé dans cette tranche | Guide présent ; disponibilité publique HTTPS et conformité du serveur de remise non démontrées. |
| TECH-06 | complet | `app/api/rooms/[id]/events/route.ts`, `src/lib/room-client.ts` | `tests/e2e/lobby.spec.ts`, `tests/e2e/visual-race.spec.ts` | Flux SSE pour salons et progression, avec reconnexion. |
| TECH-07 | complet | `src/server/room-engine.ts`, `src/server/auth-store.ts`, `app/api/results/` | Tests moteur, compte, stockage | Validations de forme, types, rôles, bornes et permissions côté serveur ; corps JSON bornés avant décodage. Tests des refus et transitions. |
| TECH-08 | partiel | `compose.yaml`, guide de déploiement | Aucun audit des contrats/factures | Aucun service payant ajouté ; gratuité de tous les services de production et accès sans frais pour correction à confirmer. |
| TECH-09 | partiel | `.github/workflows/ci.yml`, `package.json` | Workflow versionné | CI versionnée : npm ci, lint, types, tests, migrations, seed, build et Playwright. Exécution distante à confirmer. |
| TECH-10 | partiel | `.env.example`, `.gitignore`, `README.md` | Revue de configuration | Variables documentées dans .env.example et guide OAuth ; aucun secret ajouté à cette tranche. Audit de tout l’historique Git non réalisé. |

## Identité visuelle

Le travail visuel n'est pas l'objet de cette tranche. Les preuves de création personnelle doivent venir de l'auteur ; elles ne sont pas inventées par les agents.

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| DES-01 | partiel | `docs/design/direction-artistique.md`, `public/assets/guepard-logo.png` | Aucun contrôle d'antériorité | Nom utilisé ; démarche des noms envisagés et vérification d'originalité à fournir dans `docs/DEMARCHE-CREATIVE.md`. |
| DES-02 | partiel | Logo et ressources `public/assets/`, `src/components/Chrome.tsx` | Tests de structure accueil | Logo intégré ; croquis personnels et preuve de conception sans IA à fournir, favicon conforme à vérifier. |
| DES-03 | partiel | `docs/design/moodboard.md`, `docs/design/direction-artistique.md` | Documents existants | Moodboard, palette et typographies documentés ; consolidation dans le livrable demandé et chronologie à confirmer. |
| DES-04 | partiel | `src/components/Jungle.tsx`, `src/components/lobby/VisualRace.tsx`, styles | E2E visuels | Direction jungle et pistes spécifiques présentes ; audit global du caractère unique et des pictogrammes restant à faire. |
| DES-05 | complet | `src/components/SiteContext.tsx`, `src/components/Chrome.tsx` | `tests/flows.test.tsx`, `tests/e2e/how.spec.ts` | Thème initial selon préférence système, script avant peinture et préférence conservée ; test navigateur sombre. |
| DES-06 | partiel | Styles responsive, `VisualRace.tsx` | E2E mobile existants | Course mobile remplacée par recommandation de clavier physique, résultats accessibles et parcours 360 px testés ; audit visuel exhaustif reporté. |

## Comptes et profil

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| AUTH-01 | partiel | `src/components/Auth.tsx`, `src/server/auth-store.ts`, `app/api/auth/route.ts` | `tests/e2e/auth.spec.ts` | Mot de passe et sessions vérifiés avec PostgreSQL. Flux GitHub/Discord, state et PKCE GitHub implémentés et testés avec réponses simulées ; applications externes à configurer par l’auteur. |
| AUTH-02 | complet | `src/components/lobby/Lobby.tsx`, `src/server/room-engine.ts`, `src/lib/room-client.ts` | Tests salons | Pseudo invité 3–20 caractères et cookie HMAC signé ; reconnexion et déduplication des onglets. |
| AUTH-03 | complet | `src/server/room-identity.ts`, `SiteContext.tsx`, `room-engine.ts` | Tests invités | Création réservée aux comptes ; invité guépard et résultats de session. Passage invité vers compte transfère la présence sans doublon. |
| AUTH-04 | complet | `src/server/avatar-image.ts`, `app/api/auth/avatar/route.ts` | `tests/avatar-upload.test.tsx`, `tests/e2e/profile-photo.spec.ts` | JPEG/PNG/WebP, contrôle du format décodé et de 2 Mo, limite de pixels, recadrage WebP 256 × 256, persistance et suppression authentifiées. |
| AUTH-05 | complet | `src/components/AccountSettings.tsx`, `src/services/auth.ts`, `src/server/auth-store.ts`, `app/api/auth/route.ts` | `tests/account-settings.test.tsx`, `tests/account-settings-ui.test.tsx`, `tests/e2e/account-settings.spec.ts` | Modification serveur authentifiée, unicité du pseudo et persistance après rechargement vérifiées. Le pseudo est aussi le nom utilisé à la connexion ; l'avatar animal est modifiable. |
| AUTH-06 | complet | `src/components/StatsPage.tsx`, `src/server/result-store.ts`, `app/api/results/` | `tests/persistent-stats-ui.test.tsx`, `tests/result-store.test.tsx` | Meilleur MPM, moyennes de vitesse/précision, courses, victoires et graphique entre courses présents ; historique restauré et vérifié avec PostgreSQL. |

Le changement de mot de passe constitue une fonctionnalité complémentaire : mot de passe actuel vérifié, nouveau hash scrypt et révocation atomique des autres sessions. Il ne remplace aucune exigence OAuth ou d'image.

## Salles et visibilité

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| SALLE-01 | complet | `CreateRoom.tsx`, `Lobby.tsx`, `room-engine.ts` | Tests moteur et lobby | Création authentifiée, rôle hôte joueur ou spectateur, contrôle serveur et interface. |
| SALLE-02 | complet | `src/server/room-engine.ts` | `tests/room-engine.test.tsx` | Code de six caractères sans 0/O/1/I/L, génération et unicité PostgreSQL. |
| SALLE-03 | complet | `room-engine.ts`, `room-service.ts`, `Races.tsx` | Tests privés/publics | Public listé, accès par code pour public/sur code, invitation pour privé ; résolution et entrées validées côté serveur. |
| SALLE-04 | complet | `room-engine.ts`, `Lobby.tsx` | `tests/e2e/lobby.spec.ts` | Invitations aléatoires 256 bits, expiration 30 minutes, consommation atomique liée à identité et empreinte IP, reconnexion, statut et révocation. |
| SALLE-05 | complet | `src/server/room-service.ts`, `src/server/room-store.ts` | `tests/room-service.test.tsx`, `tests/room-store.test.tsx`, `tests/e2e/lobby.spec.ts` | Capacité de 2 à 30 joueurs, bots compris ; spectateurs hors capacité. Plafond testé avec trente participants. |
| SALLE-06 | complet | `src/server/room-service.ts`, `src/server/room-store.ts` | `tests/room-service.test.tsx`, `tests/room-store.test.tsx`, `tests/e2e/lobby.spec.ts` | Présence unique garantie par index PostgreSQL ; conflit explicite et action quitter le salon courant. |
| SALLE-07 | complet | `room-engine.ts`, `Lobby.tsx` | Tests permissions | Expulsion révoque présence, jeton et invitation ; bannissement de l’identité stable dans le salon. |
| SALLE-08 | complet | `src/server/room-service.ts`, `src/server/room-store.ts` | `tests/room-service.test.tsx`, `tests/room-store.test.tsx`, `tests/e2e/lobby.spec.ts` | Départ distinct de fermeture ; transfert au plus ancien humain authentifié admissible. |
| SALLE-09 | complet | `joinRoom`, `Lobby.tsx` | Tests arrivée tardive | Nouvelles entrées refusées pendant le décompte et la course ; membre existant autorisé à se reconnecter. |
| SALLE-10 | complet | `src/server/code-rate-limit.ts` | `tests/code-rate-limit.test.tsx` | Dix tentatives de code par minute et empreinte IP, compteur PostgreSQL ; proxy de confiance configurable. |

## Rejoindre une course

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| JOIN-01 | complet | `src/components/Races.tsx`, `SignBoard.tsx` | Tests salons | Champ de code sur l’accueil et dans l’explorateur. |
| JOIN-02 | complet | `Races.tsx`, `room-service.ts` | `tests/e2e/lobby.spec.ts` | Liste réelle : capacité, langue, complexité, hôte, filtres et salons joignables. |
| JOIN-03 | complet | `QuickJoin.tsx`, `room-service.ts` | Tests partie rapide | Salon public joignable le plus proche de sa capacité, puis le plus ancien ; absence explicite, aucune création automatique. |

## Configuration de course

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| CONF-01 | complet | `RoomSettings.tsx`, `validateSettings` | Tests moteur | Durée illimitée ou 30–600 secondes, validée côté serveur. |
| CONF-02 | complet | `RoomSettings.tsx`, `room-engine.ts` | Tests paramètres/génération | FR/EN indépendant de la langue de l'interface. |
| CONF-03 | complet | `generateText` dans `room-engine.ts` | Tests moteur | Corpus original FR/EN en PostgreSQL, passages cohérents et dictionnaires ; sélection via Drizzle. |
| CONF-04 | complet | `RoomSettings.tsx`, `generateText` | `tests/room-engine.test.tsx` | Longueur en mots configurable pour les textes générés. Le texte personnalisé conserve son contenu fourni. |
| CONF-05 | complet | `src/data/corpus.ts`, `src/server/text-generator.ts` | `tests/text-generator.test.tsx`, `tests/e2e/configuration.spec.ts` | Trois complexités de corpus avec critères et fixtures de génération. |
| CONF-06 | complet | `Settings`, `RoomSettings.tsx`, `generateText` | Tests génération | Options ponctuation, chiffres, accents, caractères spéciaux et majuscules. |
| CONF-07 | complet | `blacklist` dans les paramètres et `generateText` | Tests moteur | Inclusions/exclusions appliquées aux mots aléatoires ; inclusion explicite prioritaire sur une catégorie désactivée, contradiction refusée. Texte cohérent/personnalisé préservé. |
| CONF-08 | complet | `room-engine.ts`, `VisualRace.tsx` | Tests moteur et frappe | Correction obligatoire ou mode libre ; compteur d'erreurs et retour visuel présents. |
| CONF-09 | complet | `RoomSettings.tsx`, `src/server/race-bonuses.ts` | Tests bonus et paramètres | Activation facultative des bonus de remontée synchronisée. |
| CONF-10 | complet | `RoomSettings.tsx`, `Lobby.tsx`, `room-engine.ts` | Tests bots/moteur | Ajout, retrait et choix individuel de cinq niveaux. |
| CONF-11 | complet | `RoomSettings.tsx`, `Settings` | Tests visibilité | Visibilité et capacité configurables dans les bornes serveur. |
| CONF-12 | complet | SSE, `Lobby.tsx` | `tests/e2e/lobby.spec.ts` | Paramètres synchronisés et contrôles verrouillés pour les non-hôtes. |

## Déroulement de course

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| COURSE-01 | complet | `room-types.ts`, `room-engine.ts`, `docs/architecture/machine-etats.md` | Tests transitions | Attente, décompte, course et résultats explicites ; fermeture par suppression du salon. |
| COURSE-02 | complet | `act` dans `room-engine.ts` | Tests départ | Minimum deux joueurs hors spectateurs et au moins un humain participant imposés côté serveur ; départ composé uniquement de bots refusé. |
| COURSE-03 | complet | `src/server/room-engine.ts`, `VisualRace.tsx` | `tests/race-lifecycle.test.tsx`, `tests/e2e/visual-race.spec.ts` | Décompte synchronisé de trois secondes ; saisie avant départ refusée. |
| COURSE-04 | complet | `VisualRace.tsx`, `race-results.ts` | Tests de frappe et `tests/race-metrics-ui.test.tsx` | Curseur, correct/incorrect, MPM/précision, correction, blocage du collage et du glisser-déposer ; reprise de saisie. |
| COURSE-05 | partiel | `VisualRace.tsx`, `race-tracks.css`, SSE | E2E course et tests mesures | Pistes et avatars réels, interpolation visuelle et état serveur ; contrôle de fluidité sur trente clients simultanés non mesuré. |
| COURSE-06 | complet | `room-engine.ts`, `race-ranking.ts` | Tests compteurs, échéances et classement | Chronologie, bonus, progression et classement côté serveur ; budget de frappe plafonné et sauts impossibles rejetés. |
| COURSE-07 | complet | `VisualRace.tsx`, action `abandon` | Tests moteur | Confirmation explicite avec possibilité de continuer ; le serveur réserve l’abandon aux joueurs actifs. |
| COURSE-08 | complet | `room-client.ts`, `VisualRace.tsx`, `tick` | Tests restauration/reconnexion | Reconnexion SSE et saisie restaurée ; abandon après trente secondes sans présence réseau, distinct de l’inactivité de frappe. |
| COURSE-09 | complet | `tick` dans `room-engine.ts` | Tests échéances | Fin quand tous terminés/abandonnés ou échéance ; un seul concurrent actif continue. |
| COURSE-10 | complet | `race-ranking.ts`, `race-results.ts` | `tests/race-ranking.test.tsx`, `tests/race-results.test.tsx` | Finisseurs par arrivée, non-finisseurs puis abandons par progression. Égalités partagées conservées. |
| COURSE-11 | complet | `Lobby.tsx`, actions `reset`, `rematch`, `leave` | Tests résultats et revanche | Hôte peut revenir en attente, modifier paramètres, relancer ou fermer ; autres membres peuvent rester/quitter. |

## Bots

Les valeurs choisies et le traitement des erreurs sont documentés dans [bots.md](fonctionnalites/bots.md).

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| BOT-01 | complet | `src/server/bot-engine.ts`, `room-types.ts`, `Lobby.tsx` | `tests/bot-engine.test.tsx` | Cinq profils : 18/32/56/100/175 MPM de base, taux d'erreur 12/8/5/2/0,5 %. Cadence finale réduite par les hésitations/corrections. |
| BOT-02 | complet | `src/server/bot-engine.ts` | Tests variation et mots difficiles | Variation par caractère, hésitations et ralentissement sur mots longs/caractères accentués. |
| BOT-03 | complet | `src/server/bot-engine.ts` | Tests modes d'erreur | Erreurs simulées avec vrai coût temporel ; correction immédiate obligatoire ou en fin de mot en libre. |
| BOT-04 | complet | `Lobby.tsx`, `VisualRace.tsx`, `RaceResults.tsx` | Tests bots identifiés | Bots identifiés, soumis aux bonus et malus avec les mêmes règles de course. |
| BOT-05 | complet | `src/server/bot-engine.ts` | Tests rejeu et fréquence de polling | Graine salon + bot + départ ; résultat et arrivée indépendants de la fréquence des ticks. |

## Bonus de remontée

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| BONUS-01 | complet | `src/server/race-bonuses.ts`, `VisualRace.tsx` | `tests/race-bonuses.test.tsx`, `tests/race-bonuses-integration.test.tsx` | Checkpoints 25/50/75 %, dernier ou retard supérieur à 25 points, maximum trois attributions. |
| BONUS-02 | complet | `src/server/race-bonuses.ts`, `VisualRace.tsx` | `tests/race-bonuses.test.tsx`, `tests/race-bonuses-integration.test.tsx` | Raccourci de mots non tapés, détour du leader et pause de deux secondes. |
| BONUS-03 | complet | `src/server/race-bonuses.ts`, `VisualRace.tsx` | `tests/race-bonuses.test.tsx`, `tests/race-bonuses-integration.test.tsx` | Annonce locale bénéficiaire/cible, marqueur temporaire sur piste et explication de pause. |
| BONUS-04 | complet | `src/server/race-bonuses.ts`, `VisualRace.tsx` | `tests/race-bonuses.test.tsx`, `tests/race-bonuses-integration.test.tsx` | Texte individuel, dénominateur de progression et classement normalisés ; métriques basées sur les caractères réellement validés. |

## Résultats et historique

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| RES-01 | complet | `RaceResults.tsx`, `race-results.ts` | `tests/race-results.test.tsx`, E2E podium/résultats | Podium des trois premiers admissibles ; adapté à moins de trois concurrents, spectateurs et abandons exclus. |
| RES-02 | complet | `RaceResults.tsx`, `race-results.ts` | Tests calculs et résultats | Tableau net/brut, précision, erreurs, durée individuelle, statut et bonus ; heure d’abandon distincte. |
| RES-03 | complet | `RaceResults.tsx` | Tests heatmap | Courbes des participants à partir de télémétrie serveur réelle, tableau accessible et heatmap personnelle validée. |
| RES-04 | complet | `src/server/result-store.ts`, `RaceResults.tsx` | `tests/result-store.test.tsx`, `tests/e2e/results.spec.ts` | Record comparé au meilleur antérieur, sauvegardé avec le résultat et annoncé sans doublon. |
| RES-05 | complet | `room-store.ts`, `result-store.ts`, `room-identity.ts` | Tests stockage et historique | Snapshot privé et séries persistés dans la transaction de fin ; invités limités à leur session. |
| HIST-01 | complet | `result-store.ts`, `StatsPage.tsx`, `app/api/results/route.ts` | Tests stockage/UI historique | Historique serveur paginé de 10 courses validé avec 11 manches, reconnexion et fermeture du salon. Anciennes courses de démonstration locales non importées. |
| HIST-02 | complet | `src/components/lobby/HistoricalResults.tsx`, `app/api/results/[id]/route.ts`, `Site.tsx` | Tests historique | Réouverture autorisée après fermeture du salon avec courbes et heatmap du propriétaire, sans données sensibles des autres joueurs. |

## Internationalisation

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| I18N-01 | partiel | `src/i18n.ts`, composants | Tests sélecteur FR/EN | Salons, course, guide, résultats, erreurs et métadonnées FR/EN. Certains libellés bilingues restent inline dans les composants ; centralisation intégrale à terminer. |
| I18N-02 | complet | `Chrome.tsx`, `SiteContext.tsx` | `tests/flows.test.tsx` | Défaut selon navigateur, sélecteur global et préférence cookie conservée après rechargement. |
| I18N-03 | partiel | `StatsPage.tsx`, `RaceResults.tsx` | Tests interface | Dates et métriques principales localisées ; audit exhaustif de tous les nombres et anciens parcours locaux restant. |

## Tests, performance, accessibilité et sécurité

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| TEST-01 | complet | `tests/*.test.tsx`, `jest.config.json` | `npm test` | Tests unitaires moteur, classement, bots, compte et stockage ; couverture à étendre avec les fonctionnalités restantes. |
| TEST-02 | complet | `tests/e2e/`, `playwright.config.ts` | `npm run test:e2e` | Suite Playwright disponible avec parcours multi-contextes et base PostgreSQL. |
| TEST-03 | complet | `tests/e2e/auth.spec.ts`, `tests/e2e/account-settings.spec.ts` | Tests authentification et compte | Les parcours utilisent nom d'utilisateur/mot de passe, aucun OAuth simulé comme succès. |
| PERF-01 | complet | Accueil : AVIF, planches CSS dimensionnées pour mobile et différées après le fond, vues chargées à la demande, polices locales | [Bilan Lighthouse](verification-fonctionnelle.md#mesures-de-laccueil) | Lighthouse mobile local, médiane de 3 : 91 performance (93 en thème clair), 100 accessibilité, 100 bonnes pratiques, 100 SEO. À confirmer sur le déploiement public. |
| PERF-02 | partiel | File de saisie dans `VisualRace.tsx`, `room-client.ts`, `room-store.ts` | Tests saisie et moteur | Envoi regroupé environ toutes les 180 ms ; persistance par transaction serveur, pas par événement clavier brut. Écriture et volumétrie réelles à mesurer/optimiser. |
| PERF-03 | partiel | Pistes et SSE | Ancien parcours 32 membres | Capacité trente vérifiée ; mesure de fluidité de trente navigateurs simultanés non réalisée. |
| A11Y-01 | partiel | Styles jour/nuit | Revue visuelle existante | Contrastes WCAG AA de toutes les combinaisons non audités. |
| A11Y-02 | partiel | Structure des composants, `RaceResults.tsx` | Tests structure et résultats | Header/nav/main/footer, boutons/liens et vrai tableau présents ; ordre des titres et sémantique de toutes les pages à auditer. |
| A11Y-03 | partiel | Formulaires et images | Tests labels/formulaires | Libellés et alternatives présents sur parcours couverts ; audit exhaustif des images et champs restant. |
| A11Y-04 | partiel | `:focus-visible`, boîte de dialogue native, heatmap | Tests focus/heatmap | Focus visible et contrôles au clavier présents ; parcours clavier complet de tous les écrans à vérifier. |
| SEC-01 | complet | `authenticate`, `act`, `mutate`, API salons | `tests/room-engine.test.tsx`, E2E lobby/résultats | Actions hôte autorisées côté serveur, jetons distincts et non publiés dans les snapshots. |
| SEC-02 | complet | `src/server/avatar-image.ts`, `app/api/auth/avatar/route.ts` | `tests/avatar-upload.test.tsx`, `tests/e2e/profile-photo.spec.ts` | Téléversement borné, format réellement décodé, pixels limités, suppression des métadonnées et accès en écriture authentifié. |
| SEC-03 | complet | `src/server/auth-store.ts` | Tests compte, E2E auth/compte | Hash scrypt salé, comparaison constante, sessions par hash de jeton ; les mots de passe ne sont pas conservés dans le navigateur ni retournés par l'API. |

## Limites et vérifications

Les tests locaux et leurs commandes sont consignés dans [verification-fonctionnelle.md](verification-fonctionnelle.md). La présence d’un fichier de test ne prouve ni la CI distante ni le déploiement public.

- Les applications OAuth et l’hébergement ne sont pas configurés, conformément au choix de l’auteur ; code et instructions sont préparés.
- Le visuel, la démarche personnelle du nom/logo, les coordonnées légales, l’URL publique et les preuves de correction restent à fournir. Les agents ne certifient pas une création personnelle.
- Les invités conservent une identité signée de navigateur ; effacer ce cookie crée une autre identité. Les empreintes IP ne constituent pas un bannissement global des utilisateurs d’un même réseau.
- Sans proxy de confiance configuré, les tentatives de code utilisent un bucket partagé conservateur. Configurer le proxy selon le guide avant publication.
- Les anciens résultats sans télémétrie n’obtiennent aucune courbe ou heatmap inventée. Les données du seed sont synthétiques et indiquées comme démonstration.
- La centralisation de tous les libellés bilingues et les audits exhaustifs d’accessibilité/charge restent partiels. Les statuts ci-dessus conservent ces limites.

Voir [ARCHITECTURE.md](ARCHITECTURE.md), [installation/comptes-et-base.md](installation/comptes-et-base.md) et [IA.md](IA.md).
