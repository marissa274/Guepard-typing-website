# Guépard — matrice de traçabilité

État du dépôt au 12 novembre 2026, à partir du cahier des charges « Web V — Travail de session ». Cette matrice décrit les fonctionnalités présentes et les écarts connus ; elle ne certifie pas le déploiement public ni l'exécution de GitHub Actions.

**Statuts :** `complet` signifie que l'exigence décrite est implémentée et dispose de vérifications adaptées ; `partiel` signifie qu'au moins un point manque ou reste à vérifier ; `non fait` signifie que la fonctionnalité demandée n'est pas implémentée. Les tests cités sont des fichiers de preuve ; leur présence seule n'atteste pas leur dernier résultat. Le bilan de vérification de la tranche courante figure à la fin.

## Contraintes techniques

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| TECH-01 | partiel | `package.json`, `app/` | Compilation Next.js | Next.js 16.3.8, App Router et React présents ; caractère « version stable actuelle » à vérifier avant remise. |
| TECH-02 | partiel | `tsconfig.json`, `src/`, `scripts/` | `npm run typecheck` | Sources applicatives TS/TSX, mais `strict: false`, nombreux `any` explicites et pas de règle ESLint d'interdiction. |
| TECH-03 | complet | `app/globals.css`, `postcss.config.json`, `package.json` | Compilation | Tailwind CSS intégré ; des styles CSS existants restent utilisés. |
| TECH-04 | partiel | `compose.yaml`, `src/server/room-store.ts`, `src/server/auth-store.ts`, `src/server/result-store.ts`, `scripts/migrate-rooms-to-postgres.ts` | Tests de stockage, E2E PostgreSQL | PostgreSQL fonctionnel localement ; création des tables au démarrage et import des anciens salons. Migrations versionnées et seed complet corpus/utilisateurs/historique manquants. |
| TECH-05 | non fait | `docs/deploiement-railway.md`, `CHECKPOINT-1.md` | Aucun contrôle public réalisé dans cette tranche | Guide présent ; disponibilité publique HTTPS et conformité du serveur de remise non démontrées. |
| TECH-06 | complet | `app/api/rooms/[id]/events/route.ts`, `src/lib/room-client.ts` | `tests/e2e/lobby.spec.ts`, `tests/e2e/visual-race.spec.ts` | Flux SSE pour salons et progression, avec reconnexion. |
| TECH-07 | partiel | `src/server/room-engine.ts`, `src/server/auth-store.ts`, `app/api/results/` | Tests moteur, compte, stockage | Validations manuelles présentes et renforcées, mais pas de schéma exhaustif commun pour toutes les entrées API/temps réel. |
| TECH-08 | partiel | `compose.yaml`, guide de déploiement | Aucun audit des contrats/factures | Aucun service payant ajouté ; gratuité de tous les services de production et accès sans frais pour correction à confirmer. |
| TECH-09 | partiel | `.github/workflows/ci.yml`, `package.json` | Workflow versionné | Types, tests, build et E2E configurés. Étape lint absente et exécution distante GitHub Actions non vérifiée. |
| TECH-10 | partiel | `.env.example`, `.gitignore`, `README.md` | Revue de configuration | Variables PostgreSQL et URL publique documentées ; complétude de toutes les variables et audit de tout l'historique Git à terminer. |

## Identité visuelle

Le travail visuel n'est pas l'objet de cette tranche. Les preuves de création personnelle doivent venir de l'auteur ; elles ne sont pas inventées par les agents.

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| DES-01 | partiel | `docs/design/direction-artistique.md`, `public/assets/guepard-logo.png` | Aucun contrôle d'antériorité | Nom utilisé ; démarche des noms envisagés et vérification d'originalité à fournir dans `docs/DEMARCHE-CREATIVE.md`. |
| DES-02 | partiel | Logo et ressources `public/assets/`, `src/components/Chrome.tsx` | Tests de structure accueil | Logo intégré ; croquis personnels et preuve de conception sans IA à fournir, favicon conforme à vérifier. |
| DES-03 | partiel | `docs/design/moodboard.md`, `docs/design/direction-artistique.md` | Documents existants | Moodboard, palette et typographies documentés ; consolidation dans le livrable demandé et chronologie à confirmer. |
| DES-04 | partiel | `src/components/Jungle.tsx`, `src/components/lobby/VisualRace.tsx`, styles | E2E visuels | Direction jungle et pistes spécifiques présentes ; audit global du caractère unique et des pictogrammes restant à faire. |
| DES-05 | partiel | `src/components/SiteContext.tsx`, `src/components/Chrome.tsx` | `tests/flows.test.tsx`, `tests/e2e/how.spec.ts` | Thèmes et préférence enregistrée présents ; défaut système et absence de flash initial non garantis. |
| DES-06 | partiel | Styles responsive, `VisualRace.tsx` | E2E mobile existants | Parcours couverts testés sur mobile ; contrôle de toutes les pages à 360 px et remplacement de la course par recommandation de clavier physique manquants. |

## Comptes et profil

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| AUTH-01 | partiel | `src/components/Auth.tsx`, `src/server/auth-store.ts`, `app/api/auth/route.ts` | `tests/e2e/auth.spec.ts` | Inscription, mot de passe scrypt et sessions PostgreSQL présents. OAuth Discord/GitHub non configuré. |
| AUTH-02 | partiel | `src/components/lobby/Lobby.tsx`, `src/server/room-engine.ts`, `src/lib/room-client.ts` | Tests salons | Pseudo invité et jeton de membre présents ; limite actuelle 1–40 au lieu de 3–20 et jeton en sessionStorage, sans cookie invité signé. |
| AUTH-03 | partiel | `src/server/room-identity.ts`, `SiteContext.tsx`, `room-engine.ts` | Tests invités | Résultats invités limités à la session et guépard attribué ; les invités peuvent encore créer des salons. |
| AUTH-04 | non fait | Sélecteur d'animaux uniquement | Aucun | Aucun téléversement JPEG/PNG/WebP, contrôle serveur de 2 Mo ou redimensionnement. |
| AUTH-05 | complet | `src/components/AccountSettings.tsx`, `src/services/auth.ts`, `src/server/auth-store.ts`, `app/api/auth/route.ts` | `tests/account-settings.test.tsx`, `tests/account-settings-ui.test.tsx`, `tests/e2e/account-settings.spec.ts` | Modification serveur authentifiée, unicité du pseudo et persistance après rechargement vérifiées. Le pseudo est aussi le nom utilisé à la connexion ; l'avatar animal est modifiable. |
| AUTH-06 | complet | `src/components/StatsPage.tsx`, `src/server/result-store.ts`, `app/api/results/` | `tests/persistent-stats-ui.test.tsx`, `tests/result-store.test.tsx` | Meilleur MPM, moyennes de vitesse/précision, courses, victoires et graphique entre courses présents ; historique restauré et vérifié avec PostgreSQL. |

Le changement de mot de passe constitue une fonctionnalité complémentaire : mot de passe actuel vérifié, nouveau hash scrypt et révocation atomique des autres sessions. Il ne remplace aucune exigence OAuth ou d'image.

## Salles et visibilité

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| SALLE-01 | partiel | `CreateRoom.tsx`, `Lobby.tsx`, `room-engine.ts` | Tests moteur et lobby | Création et rôle hôte fonctionnent, dont choix spectateur ; création pas encore réservée aux comptes connectés. |
| SALLE-02 | partiel | `src/server/room-engine.ts` | `tests/room-engine.test.tsx` | Code aléatoire actuel de 8 caractères, pas 6 ; alphabet contient encore L et unicité globale non contrainte en base. |
| SALLE-03 | partiel | `room-engine.ts`, `room-service.ts`, `Races.tsx` | Tests privés/publics | Trois visibilités présentes ; résolution par code public et lien d'invitation pour salon sur code incomplets. |
| SALLE-04 | partiel | `room-engine.ts`, `Lobby.tsx` | `tests/e2e/lobby.spec.ts` | UUID aléatoire, consommation unique atomique et expiration de 30 min présents pour privé. Pas d'association IP, réutilisation par le même invité, statut utilisé par qui ou révocation durable liée à une expulsion. |
| SALLE-05 | non fait | `src/lib/room-types.ts` | Ancien test 32 personnes ≠ conformité | Pas de capacité configurable 2–30 ; absence de plafond actuelle. |
| SALLE-06 | non fait | Jetons par salon en sessionStorage | Aucun test de contrainte base | Pas de présence unique intersalons garantie en PostgreSQL ni de dialogue pour quitter le salon courant. |
| SALLE-07 | partiel | `room-engine.ts`, `Lobby.tsx` | Tests permissions | L'hôte peut retirer un membre et son jeton est révoqué ; pas de bannissement empêchant une nouvelle entrée. |
| SALLE-08 | non fait | `src/server/room-service.ts` | Tests départ hôte existants | Le départ de l'hôte ferme actuellement le salon au lieu de transférer son rôle. |
| SALLE-09 | partiel | `joinRoom`, `Lobby.tsx` | Tests arrivée tardive | Entrée en attente et arrivée spectatrice après départ ; le cahier des charges interdit toute entrée pendant une course. |
| SALLE-10 | non fait | API salons | Aucun | Aucune limitation de tentatives par IP pour les codes. |

## Rejoindre une course

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| JOIN-01 | partiel | `src/components/Races.tsx`, `SignBoard.tsx` | Tests salons | Champ de code sur `/races`, pas directement sur l'accueil. |
| JOIN-02 | partiel | `Races.tsx`, `room-service.ts` | `tests/e2e/lobby.spec.ts` | Liste publique réelle et rafraîchissement automatique ; capacité, complexité, hôte et filtres langue/complexité manquants. |
| JOIN-03 | partiel | `QuickJoin.tsx`, `room-service.ts` | Tests partie rapide | Recherche d'un salon public en attente par nombre de joueurs ; pas de capacité ni départage explicite par ancienneté. Crée automatiquement un salon même pour invité quand aucun n'est disponible. |

## Configuration de course

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| CONF-01 | partiel | `RoomSettings.tsx`, `validateSettings` | Tests moteur | Aucune limite ou durée configurable ; bornes serveur actuelles 0–3600 s au lieu de 30–600 s hors mode illimité. |
| CONF-02 | complet | `RoomSettings.tsx`, `room-engine.ts` | Tests paramètres/génération | FR/EN indépendant de la langue de l'interface. |
| CONF-03 | partiel | `generateText` dans `room-engine.ts` | Tests moteur | Mots et phrases embarqués en code ; pas de corpus cohérent réel ni dictionnaire stockés en base. |
| CONF-04 | complet | `RoomSettings.tsx`, `generateText` | `tests/room-engine.test.tsx` | Longueur en mots configurable pour les textes générés. Le texte personnalisé conserve son contenu fourni. |
| CONF-05 | non fait | Paramètres actuels | Aucun | Pas de trois complexités avec critères mesurables ; les banques thématiques ne sont pas des niveaux de complexité. |
| CONF-06 | partiel | `Settings`, `RoomSettings.tsx`, `generateText` | Tests génération | Ponctuation, nombres et accents présents ; option majuscules manquante. |
| CONF-07 | partiel | `blacklist` dans les paramètres et `generateText` | Tests moteur | Exclusion appliquée en filtrant tous les types de texte ; inclusion absente et mode cohérent pas traité selon les règles demandées. |
| CONF-08 | complet | `room-engine.ts`, `VisualRace.tsx` | Tests moteur et frappe | Correction obligatoire ou mode libre ; compteur d'erreurs et retour visuel présents. |
| CONF-09 | non fait | Aucun paramètre de bonus | Aucun | Pas d'activation des bonus de remontée. |
| CONF-10 | complet | `RoomSettings.tsx`, `Lobby.tsx`, `room-engine.ts` | Tests bots/moteur | Ajout, retrait et choix individuel de cinq niveaux. |
| CONF-11 | partiel | `RoomSettings.tsx`, `Settings` | Tests visibilité | Visibilité présente ; capacité manquante. |
| CONF-12 | complet | SSE, `Lobby.tsx` | `tests/e2e/lobby.spec.ts` | Paramètres synchronisés et contrôles verrouillés pour les non-hôtes. |

## Déroulement de course

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| COURSE-01 | partiel | `room-types.ts`, `room-engine.ts`, `docs/architecture/machine-etats.md` | Tests transitions | Attente, course, résultats implémentés ; décompte explicite manquant et fermeture représentée par retrait du salon. |
| COURSE-02 | complet | `act` dans `room-engine.ts` | Tests départ | Minimum deux joueurs hors spectateurs et au moins un humain participant imposés côté serveur ; départ composé uniquement de bots refusé. |
| COURSE-03 | non fait | Départ serveur immédiat | Aucun test de décompte | Pas de 3, 2, 1 synchronisé avant la course. |
| COURSE-04 | partiel | `VisualRace.tsx`, `race-results.ts` | Tests de frappe et `tests/race-metrics-ui.test.tsx` | Retour correct/incorrect, MPM/précision en direct, coller et glisser-déposer bloqués ; curseur de caractère explicite à compléter. |
| COURSE-05 | partiel | `VisualRace.tsx`, `race-tracks.css`, SSE | E2E course et tests mesures | Pistes, noms, avatars, joueur local et spectateurs présents ; fluidité perçue de 4 mises à jour/s sur tous clients non démontrée (SSE environ 600 ms). |
| COURSE-06 | partiel | `room-engine.ts`, `race-ranking.ts` | Tests compteurs, échéances et classement | Départ/fin, classement et valeurs numériques contrôlés côté serveur ; pas encore de rejet des sauts/vitesses humaines irréalistes ni de bonus. |
| COURSE-07 | complet | `VisualRace.tsx`, action `abandon` | Tests moteur | Confirmation explicite avec possibilité de continuer ; le serveur réserve l’abandon aux joueurs actifs. |
| COURSE-08 | partiel | `room-client.ts`, `VisualRace.tsx`, `tick` | Tests restauration/reconnexion | Saisie restaurée et SSE reconnecté ; abandon basé sur inactivité de frappe configurable, pas fenêtre de déconnexion de 30 s. |
| COURSE-09 | partiel | `tick` dans `room-engine.ts` | Tests échéances | Fin pour tous terminés/abandonnés et échéance ; règle supplémentaire actuelle de fin s'il reste un seul joueur après abandon, à aligner. |
| COURSE-10 | complet | `race-ranking.ts`, `race-results.ts` | `tests/race-ranking.test.tsx`, `tests/race-results.test.tsx` | Finisseurs par arrivée, non-finisseurs puis abandons par progression. Égalités partagées conservées. |
| COURSE-11 | complet | `Lobby.tsx`, actions `reset`, `rematch`, `leave` | Tests résultats et revanche | Hôte peut revenir en attente, modifier paramètres, relancer ou fermer ; autres membres peuvent rester/quitter. |

## Bots

Les valeurs choisies et le traitement des erreurs sont documentés dans [bots.md](fonctionnalites/bots.md).

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| BOT-01 | complet | `src/server/bot-engine.ts`, `room-types.ts`, `Lobby.tsx` | `tests/bot-engine.test.tsx` | Cinq profils : 18/32/56/100/175 MPM de base, taux d'erreur 12/8/5/2/0,5 %. Cadence finale réduite par les hésitations/corrections. |
| BOT-02 | complet | `src/server/bot-engine.ts` | Tests variation et mots difficiles | Variation par caractère, hésitations et ralentissement sur mots longs/caractères accentués. |
| BOT-03 | complet | `src/server/bot-engine.ts` | Tests modes d'erreur | Erreurs simulées avec vrai coût temporel ; correction immédiate obligatoire ou en fin de mot en libre. |
| BOT-04 | partiel | `Lobby.tsx`, `VisualRace.tsx`, `RaceResults.tsx` | Tests bots identifiés | Bots marqués dans l'interface ; aucun bonus/malus implémenté pour eux ou les humains. |
| BOT-05 | complet | `src/server/bot-engine.ts` | Tests rejeu et fréquence de polling | Graine salon + bot + départ ; résultat et arrivée indépendants de la fréquence des ticks. |

## Bonus de remontée

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| BONUS-01 | non fait | Aucun moteur de bonus | Aucun | Pas de checkpoints 25/50/75 % ni attribution de trois bonus maximum. |
| BONUS-02 | non fait | Aucun | Aucun | Pas de trois types de bonus. |
| BONUS-03 | non fait | Aucun | Aucun | Pas d'annonce sur piste ou chez la cible. |
| BONUS-04 | non fait | Texte commun fixe | Aucun | Pas d'adaptation progression/MPM aux textes modifiés par bonus. |

## Résultats et historique

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| RES-01 | complet | `RaceResults.tsx`, `race-results.ts` | `tests/race-results.test.tsx`, E2E podium/résultats | Podium des trois premiers admissibles ; adapté à moins de trois concurrents, spectateurs et abandons exclus. |
| RES-02 | partiel | `RaceResults.tsx`, `race-results.ts` | Tests calculs et résultats | Rang, participant, MPM net/brut, précision, erreurs, durée et statut présents ; colonne bonus reçus manquante. L’heure d’abandon distincte n’est pas enregistrée : les mesures d’un abandonné utilisent encore la fin globale. Score affiché comme indéfini, non requis pour remplacer ces mesures. |
| RES-03 | partiel | `RaceResults.tsx` | Tests heatmap | Heatmap des frappes locales présente ; graphique de séries MPM de tous les participants absent. Le graphique entre courses du profil ne remplace pas cette exigence. |
| RES-04 | non fait | Aucun indicateur de record battu | Aucun | Meilleur MPM agrégé disponible ; aucune annonce d'un nouveau record sur les résultats. |
| RES-05 | partiel | `room-store.ts`, `result-store.ts`, `room-identity.ts` | Tests stockage et historique | Persistance serveur transactionnelle des résultats des humains connectés implémentée, isolée par compte ; pas de série temporelle MPM persistée. |
| HIST-01 | complet | `result-store.ts`, `StatsPage.tsx`, `app/api/results/route.ts` | Tests stockage/UI historique | Historique serveur paginé de 10 courses validé avec 11 manches, reconnexion et fermeture du salon. Anciennes courses de démonstration locales non importées. |
| HIST-02 | partiel | `src/components/lobby/HistoricalResults.tsx`, `app/api/results/[id]/route.ts`, `Site.tsx` | Tests historique | Réouverture d'un snapshot autorisé par compte implémentée ; séries MPM et heatmap distante absentes, donc résultats complets du cahier des charges non réaffichables à ce stade. |

## Internationalisation

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| I18N-01 | partiel | `src/i18n.ts`, composants | Tests sélecteur FR/EN | Traductions présentes ; chaînes codées en dur, salons/résultats et erreurs serveur encore largement français, métadonnées à compléter. |
| I18N-02 | partiel | `Chrome.tsx`, `SiteContext.tsx` | `tests/flows.test.tsx` | Sélecteur global et choix conservé en localStorage ; pas de défaut selon navigateur ni conservation en cookie/profil comme demandé. |
| I18N-03 | partiel | `StatsPage.tsx`, `RaceResults.tsx` | Tests interface | Dates du profil selon langue ; format des résultats forcé en français et nombres pas uniformément localisés. |

## Tests, performance, accessibilité et sécurité

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| TEST-01 | complet | `tests/*.test.tsx`, `jest.config.json` | `npm test` | Tests unitaires moteur, classement, bots, compte et stockage ; couverture à étendre avec les fonctionnalités restantes. |
| TEST-02 | complet | `tests/e2e/`, `playwright.config.ts` | `npm run test:e2e` | Suite Playwright disponible avec parcours multi-contextes et base PostgreSQL. |
| TEST-03 | complet | `tests/e2e/auth.spec.ts`, `tests/e2e/account-settings.spec.ts` | Tests authentification et compte | Les parcours utilisent nom d'utilisateur/mot de passe, aucun OAuth simulé comme succès. |
| PERF-01 | non fait | Accueil | Aucun rapport Lighthouse de la tranche | Seuil 90 dans chaque catégorie non démontré. |
| PERF-02 | partiel | File de saisie dans `VisualRace.tsx`, `room-client.ts`, `room-store.ts` | Tests saisie et moteur | Envoi regroupé environ toutes les 180 ms ; persistance par transaction serveur, pas par événement clavier brut. Écriture et volumétrie réelles à mesurer/optimiser. |
| PERF-03 | partiel | Pistes et SSE | Ancien parcours 32 membres | Tests de présence à plusieurs disponibles, mais fluidité à capacité maximale non mesurée et capacité demandée pas implémentée. |
| A11Y-01 | partiel | Styles jour/nuit | Revue visuelle existante | Contrastes WCAG AA de toutes les combinaisons non audités. |
| A11Y-02 | partiel | Structure des composants, `RaceResults.tsx` | Tests structure et résultats | Header/nav/main/footer, boutons/liens et vrai tableau présents ; ordre des titres et sémantique de toutes les pages à auditer. |
| A11Y-03 | partiel | Formulaires et images | Tests labels/formulaires | Libellés et alternatives présents sur parcours couverts ; audit exhaustif des images et champs restant. |
| A11Y-04 | partiel | `:focus-visible`, boîte de dialogue native, heatmap | Tests focus/heatmap | Focus visible et contrôles au clavier présents ; parcours clavier complet de tous les écrans à vérifier. |
| SEC-01 | complet | `authenticate`, `act`, `mutate`, API salons | `tests/room-engine.test.tsx`, E2E lobby/résultats | Actions hôte autorisées côté serveur, jetons distincts et non publiés dans les snapshots. |
| SEC-02 | non fait | Aucun endpoint de téléversement | Aucun | Validation type réel/taille à implémenter avec AUTH-04. |
| SEC-03 | complet | `src/server/auth-store.ts` | Tests compte, E2E auth/compte | Hash scrypt salé, comparaison constante, sessions par hash de jeton ; les mots de passe ne sont pas conservés dans le navigateur ni retournés par l'API. |

## Choix actuels et écarts à résoudre

- Le pseudo de compte est aussi son identifiant de connexion. Modifier le profil modifie donc le nom à saisir pour se reconnecter. Cette décision suit le modèle existant à champ unique ; un nom d'affichage séparé pourra être introduit si nécessaire.
- Les statistiques des invités restent en session navigateur. Les courses partagées des comptes connectés sont enregistrées côté serveur à la fin ; l'identité de compte est établie depuis le cookie serveur, jamais depuis un identifiant fourni par le client.
- Les égalités partagent le même rang. La vitesse nette utilise les caractères validés, espaces compris ; la vitesse brute utilise les frappes totales. Une précision sans frappe est affichée « — ».
- Les liens privés actuels expirent en 30 minutes et ne sont consommables qu'une fois. Ce choix provisoire ne respecte pas encore la reconnexion par IP exigée ; il est déclaré partiel.
- L'arrivée tardive actuelle donne le rôle spectateur et l'hôte qui quitte ferme le salon. Ces comportements existants ne sont pas présentés comme conformes aux règles finales.
- Les bonus, OAuth, téléversement photo, contraintes complètes de salle, corpus en base, séries MPM et TypeScript strict restent des travaux distincts. Les champs absents ne sont pas inventés dans les données historiques.

## Vérifications de cette tranche

Compte : 11 tests unitaires/interface et les 10 tests de parcours React existants ont passé ensemble ; typage vérifié. Le scénario Playwright `account-settings.spec.ts` a passé avec PostgreSQL local : conflit pseudo, modification persistée après rechargement, mauvais mot de passe actuel refusé, changement accepté, autres sessions révoquées, reconnexion avec l'ancien mot de passe refusée et le nouveau acceptée.

Bilan d’intégration : 81 tests unitaires dans 12 suites et les 17 parcours Playwright passent, avec PostgreSQL local ; `npm run typecheck` passe. Le défaut intermittent de focus au départ a été reproduit par un test ciblé puis corrigé avant le passage complet de la suite navigateur. `npm run build` passe après cette dernière correction. Les tests locaux ne prouvent pas un déploiement HTTPS ou une CI distante réussie.

L’utilisation des agents et les erreurs corrigées sont documentées dans [IA.md](IA.md).

Livrables encore à consolider : `docs/DEMARCHE-CREATIVE.md`, `docs/ARCHITECTURE.md`, captures et compte de démonstration du README, URL publique de remise et preuves de CI/performance. Les documents existants dans `docs/design/` et `docs/architecture/` servent de base et ne remplacent pas automatiquement les livrables exigés.
