# Guépard — matrice de traçabilité

État du dépôt au 18 novembre 2026, à partir du cahier des charges « Web V — Travail de session ». Cette matrice décrit les fonctionnalités présentes et les écarts connus ; elle ne certifie pas le déploiement public ni l'exécution de GitHub Actions.

**Statuts :** `complet` signifie que l'exigence décrite est implémentée et dispose de vérifications adaptées ; `partiel` signifie qu'au moins un point manque ou reste à vérifier ; `non fait` signifie que la fonctionnalité demandée n'est pas implémentée. Les tests cités sont des fichiers de preuve ; leur présence seule n'atteste pas leur dernier résultat. Le bilan de vérification de la tranche courante figure à la fin.

## Contraintes techniques

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| TECH-01 | complet | `package.json`, `app/` | Compilation Next.js | Next.js 16.4.6, App Router et React ; compilation de production vérifiée. |
| TECH-02 | complet | `tsconfig.json`, `src/`, `scripts/` | `npm run typecheck` | TypeScript strict activé ; ESLint interdit les any explicites. Lint et typage passent. |
| TECH-03 | partiel | `app/globals.css`, `src/styles/*.css`, `postcss.config.json`, `scripts/tailwind-metrics.ts`, `docs/architecture/migration-tailwind.md` | Compilation, `npm run tailwind:metrics`, `npm run test:visual` (captures et styles calculés), `npm run test:e2e` | Tailwind CSS v4 est l'unique point d'entrée (`app/globals.css`, jetons de couleur et variantes de largeur) ; le style des composants est en utilitaires. Mesure `npm run tailwind:metrics` : critères 1 à 5 verts (85,2 % des déclarations d'origine hors CSS, CSS restant 34,8 Ko, 0 / 0 `[data-theme=dark]` et `@media` de largeur bruts, hex hors `@theme` 13 / 0 hors dégradés), critère 6 rouge (39 règles). Les couleurs des feuilles et les 171 classes à hex arbitraire du TSX sont passées en jetons `@theme` de même valeur ; restent 18 hex littéraux dans le TSX (10 attributs SVG de `SignBoard`, 8 couleurs de coureurs). Statut `partiel` : `--strict` échoue encore sur le critère 6 (39 règles de mise en page de base ou partagées entre composants, justifiées dans le document de migration) ; 13 hex restent dans 5 déclarations de dégradés dont un `var()` changerait la sérialisation des styles calculés. Visuel : 384 cas sur 385 identiques ; seul `home-plank-hover-dark-360` échoue, à l'identique avant et après (valeur de fin de transition, référence instable). |
| TECH-04 | complet | `migrations/`, `scripts/db-migrate.ts`, `scripts/db-seed.ts`, `src/server/db-schema.ts` | Migrations/seed idempotents, E2E PostgreSQL | Trois migrations SQL versionnées avec checksums ; seed idempotent corpus, compte et historique. Corpus interrogé via Drizzle ; transactions explicites avec pg. |
| TECH-05 | complet | `docs/deploiement-railway.md`, `instrumentation.ts`, `.env.example` | `tests/instrumentation.test.tsx` ; vérification manuelle en production le 20 novembre 2026 | Application publique en HTTPS sur Railway : https://guepard-typing-website-production.up.railway.app. Railway est un hébergement géré et non un VPS loué : l'enseignant a confirmé que Railway était accepté. Base PostgreSQL Railway, migrations en pré-déploiement ; le serveur refuse de démarrer sans `AUTH_SECRET`. |
| TECH-06 | complet | `app/api/rooms/[id]/events/route.ts`, `src/lib/room-client.ts` | `tests/e2e/lobby.spec.ts`, `tests/e2e/visual-race.spec.ts` | Flux SSE pour salons et progression, avec reconnexion. |
| TECH-07 | complet | `src/server/room-engine.ts`, `src/server/auth-store.ts`, `app/api/results/` | Tests moteur, compte, stockage | Validations de forme, types, rôles, bornes et permissions côté serveur ; corps JSON bornés avant décodage. Tests des refus et transitions. |
| TECH-08 | complet | `compose.yaml`, `docs/deploiement-railway.md` | Revue des services utilisés | Aucun service payant : l'hébergement Railway (serveur et PostgreSQL) est sur une offre gratuite, et GitHub et Discord (OAuth) sont gratuits. Le correcteur accède au site et au compte de démonstration sans frais ni clé. |
| TECH-09 | complet | `.github/workflows/ci.yml`, `package.json` | Exécution GitHub Actions n° 44833983789 sur `main` (20 novembre 2026) : succès | Chaque push exécute npm ci, le lint, la vérification de types (`tsc --noEmit`), les tests unitaires, les migrations et le seed sur PostgreSQL, la compilation et les tests Playwright. |
| TECH-10 | complet | `.env.example`, `.gitignore`, `README.md` | Revue de configuration ; recherche de secrets dans l'historique Git | Toutes les variables sont documentées dans `.env.example` (noms et rôle, sans valeur réelle). Recherche par motifs du 20 novembre 2026 sur 83 commits et 917 versions de fichiers : aucun `.env` réel, aucune clé OAuth réelle, aucune URL de base distante avec mot de passe ; seules des valeurs de test (CI, tests, exemple de doc). Une recherche par motifs n'est pas une garantie absolue. |

## Identité visuelle

Le travail visuel n'est pas l'objet de cette tranche. Les preuves de création personnelle doivent venir de l'auteur ; elles ne sont pas inventées par les agents.

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| DES-01 | partiel | `docs/DEMARCHE-CREATIVE.md`, `docs/DEMARCHE-CREATIVE.pdf` | Recherche d'originalité documentée (20 novembre 2026) | Noms envisagés, raison du choix et vérification d'originalité documentés. Déclaré partiel par honnêteté : l'idée et le choix final viennent de l'autrice, mais ChatGPT a aidé à chercher des noms, alors que l'énoncé demande un nom trouvé sans IA. |
| DES-02 | partiel | `public/assets/guepard-logo.png`, `app/icon.png`, `app/apple-icon.png`, `src/components/Chrome.tsx`, `docs/DEMARCHE-CREATIVE.md` | Tests de structure de l'accueil ; favicon servi vérifié après compilation | Logo utilisé dans l'en-tête et comme favicon. Déclaré partiel par honnêteté : l'idée (guépard endormi sur un clavier) et les demandes de modification viennent de l'autrice, mais le logo final a été généré avec ChatGPT, et la photo du croquis personnel n'a pas été retrouvée ; l'énoncé demande un logo conçu sans IA. |
| DES-03 | partiel | `docs/DEMARCHE-CREATIVE.md`, `docs/design/moodboard.md`, `docs/design/direction-artistique.md` | Documents versionnés | La démarche créative contient le moodboard (4 références), la palette (6 couleurs avec leurs codes) et les typographies (Nunito, DM Sans, Kalam). Déclaré partiel par honnêteté sur la chronologie : la direction artistique est datée et versionnée le 7 octobre 2026, alors que les premiers commits de code datent du 2 octobre 2026 ; elle n'a donc pas été documentée avant le début du développement. |
| DES-04 | complet | `src/components/Jungle.tsx`, `src/components/SignBoard.tsx`, `src/components/lobby/VisualRace.tsx`, `src/components/AnimalAvatar.tsx`, styles | E2E visuels, captures de référence | Direction jungle propre : scène illustrée, panneaux en bois, animaux dessinés, pistes de course thématiques (rivière, canopée, clairière) comme élément signature. Vérifié le 20 novembre 2026 : aucun composant shadcn/ui, aucun dégradé violet, aucun émoji utilisé comme icône (les deux derniers, dans la course locale, ont été remplacés par les avatars dessinés), pas de mise en page de type SaaS. |
| DES-05 | complet | `src/components/SiteContext.tsx`, `src/components/Chrome.tsx` | `tests/flows.test.tsx`, `tests/e2e/how.spec.ts` | Thème initial selon préférence système, script avant peinture et préférence conservée ; test navigateur sombre. |
| DES-06 | complet | `src/components/Chrome.tsx`, `src/components/Jungle.tsx`, `VisualRace.tsx`, styles responsive | `tests/header-mobile.test.tsx`, `tests/e2e/home-layout.spec.ts`, E2E mobile | Audit du 20 novembre 2026 : aucun défilement horizontal sur les 14 pages à 360 px (FR/EN, invité/connecté) ; en-tête vérifié sans débordement de 320 à 1440 px ; noms longs tronqués ; accueil réorganisé sous 1250 px. Sur mobile, la course est remplacée par un message recommandant un clavier physique. |

## Comptes et profil

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| AUTH-01 | complet | `src/components/Auth.tsx`, `src/server/auth-store.ts`, `app/api/auth/route.ts`, `app/api/auth/[provider]/` | `tests/e2e/auth.spec.ts`, `tests/oauth-flow.test.tsx` | Connexion par mot de passe et sessions vérifiées avec PostgreSQL. GitHub et Discord (state, PKCE pour GitHub) configurés en production et vérifiés manuellement par l'autrice le 20 novembre 2026. |
| AUTH-02 | complet | `src/components/lobby/Lobby.tsx`, `src/server/room-engine.ts`, `src/lib/room-client.ts` | Tests salons | Pseudo invité 3–20 caractères et cookie HMAC signé ; reconnexion et déduplication des onglets. |
| AUTH-03 | complet | `src/server/room-identity.ts`, `SiteContext.tsx`, `room-engine.ts` | Tests invités | Création réservée aux comptes ; invité guépard et résultats de session. Passage invité vers compte transfère la présence sans doublon. |
| AUTH-04 | complet | `src/server/avatar-image.ts`, `app/api/auth/avatar/route.ts` | `tests/avatar-upload.test.tsx`, `tests/e2e/profile-photo.spec.ts` | JPEG/PNG/WebP, contrôle du format décodé et de 2 Mo, limite de pixels, recadrage WebP 256 × 256, persistance et suppression authentifiées. |
| AUTH-05 | complet | `src/components/AccountSettings.tsx`, `src/services/auth.ts`, `src/server/auth-store.ts`, `app/api/auth/route.ts` | `tests/account-settings.test.tsx`, `tests/account-settings-ui.test.tsx`, `tests/e2e/account-settings.spec.ts` | Modification serveur authentifiée, unicité du pseudo et persistance après rechargement vérifiées. Le pseudo est aussi le nom utilisé à la connexion ; l'avatar animal est modifiable. |
| AUTH-06 | complet | `src/components/StatsPage.tsx`, `src/server/result-store.ts`, `app/api/results/` | `tests/persistent-stats-ui.test.tsx`, `tests/result-store.test.tsx` | Meilleur MPM, moyennes de vitesse/précision, courses, victoires et graphique entre courses présents ; historique restauré et vérifié avec PostgreSQL. |

Le changement de mot de passe constitue une fonctionnalité complémentaire : mot de passe actuel vérifié, nouveau hash scrypt et révocation atomique des autres sessions. Il ne remplace aucune exigence OAuth ou d'image.

## Salles et visibilité

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| SALLE-01 | complet | `CreateRoom.tsx`, `AnimalAvatar.tsx`, `Lobby.tsx`, `room-engine.ts` | Tests moteur et lobby, `tests/create-room.test.tsx` | Création authentifiée, rôle hôte joueur ou spectateur, contrôle serveur et interface. Les boutons radio du choix de paysage ne sont plus `required` (le navigateur bloquait l'envoi sur un contrôle masqué, sans message) : le message « Choisis l’animal de ta course. » s'affiche près du sélecteur et le focus y est placé. |
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
| COURSE-03 | complet | `src/server/room-engine.ts`, `VisualRace.tsx` | `tests/race-lifecycle.test.tsx`, `tests/visual-race-track.test.tsx`, `tests/e2e/visual-race.spec.ts` | Décompte synchronisé de trois secondes ; saisie avant départ refusée. Le champ de saisie reçoit le focus dès qu'il devient actif (fin du décompte local ou de la pause du meneur), pas seulement au changement de phase. |
| COURSE-04 | complet | `VisualRace.tsx`, `race-results.ts` | Tests de frappe et `tests/race-metrics-ui.test.tsx` | Curseur, correct/incorrect, MPM/précision, correction, blocage du collage et du glisser-déposer ; reprise de saisie. |
| COURSE-05 | complet | `VisualRace.tsx`, `race-tracks.css`, SSE | E2E course, tests mesures, `tests/load/race-30.spec.ts` | Chaque participant (humain ou bot) a son avatar, son nom, sa position et son MPM ; le joueur local est mis en évidence ; les spectateurs voient la piste sans zone de frappe. Interpolation visuelle à chaque image. Mesuré en local sur une vraie course à 30 joueurs : 59 à 60 images par seconde chez l'observateur, délai de réception des autres joueurs p50 440 à 522 ms ([course-30-joueurs.md](perf/course-30-joueurs.md)). Mesure locale, pas sur l'hébergement réel. |
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
| I18N-01 | complet | `src/i18n.ts`, `src/i18n/`, `src/i18n/errors.ts`, `src/lib/room-copy.ts`, composants | `tests/i18n.test.tsx`, `tests/server-error-i18n.test.tsx`, tests sélecteur FR/EN | Interface, libellés ARIA, nom invité par défaut, états vides, métadonnées des pages et messages d'erreur en FR/EN. Les messages d'erreur de l'API sont traduits côté client par une table FR→EN (97 entrées) ; un test parcourt `src/server` et `app/api` et échoue si un message destiné à l'utilisateur n'a pas de traduction. Choix documenté : les noms propres (« Français », « English », prénoms de démonstration) ne sont pas traduits, et les messages réservés à l'exploitant (journaux, erreurs de démarrage) restent en français. |
| I18N-02 | complet | `Chrome.tsx`, `SiteContext.tsx` | `tests/flows.test.tsx` | Défaut selon navigateur, sélecteur global et préférence cookie conservée après rechargement. |
| I18N-03 | complet | `src/i18n/format.ts` | Tests i18n et interface | Nombres, pourcentages, durées et dates formatés par `Intl` avec les locales `fr-FR` et `en-US` (par exemple 86 % et 13,2 s en français, 98% et 11.1 sec en anglais). |

## Tests, performance, accessibilité et sécurité

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| TEST-01 | complet | `tests/*.test.tsx`, `jest.config.json` | `npm test` | Tests unitaires moteur, classement, bots, compte et stockage ; couverture à étendre avec les fonctionnalités restantes. |
| TEST-02 | complet | `tests/e2e/`, `playwright.config.ts` | `npm run test:e2e` | Suite Playwright disponible avec parcours multi-contextes et base PostgreSQL. |
| TEST-03 | complet | `tests/e2e/auth.spec.ts`, `tests/e2e/account-settings.spec.ts` | Tests authentification et compte | Les parcours utilisent nom d'utilisateur/mot de passe, aucun OAuth simulé comme succès. |
| PERF-01 | complet | Accueil : AVIF, planches CSS dimensionnées pour mobile et différées après le fond, image du ciel du thème actif chargée en priorité, vues chargées à la demande, polices locales, en-têtes de cache longs | [Bilan Lighthouse](verification-fonctionnelle.md#mesures-de-laccueil) ; mesures sur l'URL publique | Lighthouse dans Chrome (mobile) sur https://guepard-typing-website-production.up.railway.app, 20 novembre 2026 à 20 h 51, après le déploiement final : performance 96 en navigation privée (20 h 53) et 95 en session connectée (20 h 51), accessibilité 100, bonnes pratiques 100, SEO 100 (session connectée, cache du serveur chaud). Mesures antérieures, gardées par transparence : 86 et 64 avant l'optimisation, 73 juste après le déploiement en navigation privée (première optimisation d'image côté serveur, avertissement « page chargée trop lentement »). Le score de performance varie d'une mesure à l'autre selon le réseau et le cache. |
| PERF-02 | complet | File de saisie dans `VisualRace.tsx`, `room-client.ts`, `room-store.ts` | Tests saisie et moteur, `tests/room-store-locks.test.tsx`, `tests/load/race-30.spec.ts` | Progression envoyée par lots environ toutes les 180 ms (au plus environ 6 messages par seconde par joueur) ; aucune écriture en base par frappe : une transaction par lot, et les lots simultanés d'une même salle sont regroupés. Mesuré en local à 30 joueurs : progression p50 133 à 147 ms (avant optimisation : 1675 ms). |
| PERF-03 | complet | Pistes et SSE, `room-store.ts` | `tests/load/race-30.spec.ts` | Course réelle à 30 joueurs mesurée en local (29 clients HTTP/SSE et 1 vrai navigateur) : 59 à 60 images par seconde sur la piste, 0 erreur, 0 déconnexion SSE, 30 résultats persistés. Limite : mesure locale, pas avec 30 navigateurs ni sur l'hébergement réel ([course-30-joueurs.md](perf/course-30-joueurs.md)). |
| A11Y-01 | complet | Jetons de couleur `@theme` de `app/globals.css`, styles jour/nuit | `tests/a11y-contrast.test.tsx` ; audit axe-core et mesure des pixels (14 pages × FR/EN × clair/sombre × invité/connecté, plus le salon) | Les défauts mesurés (titres et liens de /create en sombre, cartes de /how, notes du sélecteur, placeholders, pied de page, cartes des expéditions, podium) sont corrigés à 4,5:1 ou plus. Noms sur les plaques du podium : #332512 sur le bois #c79358, environ 5,5:1 sur la couleur de base (la texture empêche une mesure pixel par pixel fiable). |
| A11Y-02 | complet | Structure des composants, `RaceResults.tsx`, `app/[[...path]]/page.tsx` | `tests/a11y-site.test.tsx`, `tests/page-metadata.test.tsx`, audit axe-core | Un seul h1 par vue (y compris l'écran de résultats du salon), aucun saut de niveau, `header`/`nav`/`main`/`footer`, `<table>` pour les résultats, `<button>` pour les actions et `<a>` pour la navigation ; titre de page rendu côté serveur dans la langue de la requête. |
| A11Y-03 | complet | Formulaires, images, `Chrome.tsx` | `tests/a11y-components.test.tsx`, audit axe-core | Audit des 14 pages : chaque image a un `alt` (vide pour le décor), chaque champ a un libellé, chaque bouton-icône a un nom accessible ; le nom du bouton de langue commence par son texte visible. |
| A11Y-04 | complet | `:focus-visible`, `AccountSettings.tsx`, `Chrome.tsx`, heatmap | `tests/account-settings-ui.test.tsx`, tests focus/heatmap, parcours clavier scripté | Parcours au clavier de toutes les pages, du salon, de la course et des résultats, sans piège ; anneau de focus visible partout (menu du compte et planches de l'accueil corrigés) ; le focus revient au menu du compte à la fermeture des Paramètres. |
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
