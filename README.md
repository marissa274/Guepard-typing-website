# GUÉPARD — React, Next.js et Tailwind CSS

Application Next.js avec les illustrations, le mode nuit et les animations de la jungle conservés. Les nouveaux salons et leur API utilisent TypeScript ; les anciens composants en JSX restent à migrer.

## Démarrer

```sh
npm install
npm run dev
```

Ouvrir **http://localhost:5173/**. Le terminal doit rester ouvert.

```sh
npm test       # Tests des composants et parcours React
npm run build # Compilation Next.js de production
npm start     # Serveur de production sur le port 5173
```

## Accueil

La page `/races` présente uniquement les salons publics réellement ouverts. Chaque carte utilise le paysage entier associé à l’animal de la course, avec nom, nombre de joueurs, état et action « Rejoindre » ou « Regarder la course ». Quand aucun salon public n’existe, elle affiche un état vide et une action de création. Les cartes se superposent au défilement sur les grands écrans ; avec `prefers-reduced-motion`, elles défilent normalement. Les illustrations et leurs prompts sont documentés dans `public/assets/RACE-PROMPTS.md`.

Un header avec le logo original agrandi, une seule scène de jungle, puis le footer. Le tableau central contient trois liens accessibles : rejoindre rapidement, créer une course et parcourir les courses publiques. `/play` rejoint un salon public en attente ou en crée un si nécessaire. Les animations, profondeurs et la préférence de réduction des mouvements sont conservées.

## Architecture

Les livrables du checkpoint sont rassemblés dans le [moodboard](docs/design/moodboard.md), la [direction artistique](docs/design/direction-artistique.md), le [schéma de données](docs/architecture/schema-donnees.md), la [machine à états](docs/architecture/machine-etats.md), l'[ADR du temps réel](docs/architecture/adr-0001-temps-reel-sse.md) et la [matrice des exigences](docs/exigences/matrice-checkpoint-1.md). La CI est définie dans `.github/workflows/ci.yml`.

Versions PDF : [moodboard](docs/design/moodboard.pdf), [direction artistique](docs/design/direction-artistique.pdf), [schéma de données](docs/architecture/schema-donnees.pdf), [machine à états](docs/architecture/machine-etats.pdf), [ADR temps réel](docs/architecture/adr-0001-temps-reel-sse.pdf), [matrice des exigences](docs/exigences/matrice-checkpoint-1.pdf). Pour les régénérer après une modification des Markdown : `python3 scripts/render-checkpoint-pdfs.py` (nécessite WeasyPrint).

- `app/layout.jsx` : document Next.js et état partagé.
- `app/[[...path]]/page.jsx` : point d’entrée App Router ; navigation avec `next/link`.
- `src/components/` : composants React de la scène, du header, du footer, des courses, du jeu et des fenêtres de démonstration.
- `src/hooks/useParallax.js` : parallaxe bornée, avec nettoyage des événements et respect de `prefers-reduced-motion`.
- `src/data.js` : adaptateur des anciens parcours de démonstration ; les salons publics et privés utilisent l’API `/api/rooms`.
- `src/i18n.js` : traductions partagées.
- `app/globals.css` : Tailwind CSS et ajustements de la pancarte/logo.
- `src/style.css`, `src/jungle.css` : styles et animations historiques préservés.
- `public/assets/` : illustrations et documents des prompts.

Les chemins `/login`, `/signup`, `/play`, `/races`, `/create`, `/lobby/:id`, `/race/:id`, `/how`, `/stats` et les pages d’information sont accessibles directement. `/private` reste un alias de `/create`. Les anciens liens `#/…` sont redirigés vers les nouveaux chemins. Les préférences existantes `guepard-*` sont reprises.

## Démonstration et futur backend

La connexion par nom d’utilisateur et mot de passe utilise PostgreSQL. Les anciens parcours `/race/:id` restent locaux ; les salons `/lobby/:id` sont partagés entre navigateurs.

La création de course ouvre un salon partagé `/lobby/:id`. Les paramètres, participants et départ sont synchronisés entre navigateurs. La page des courses publiques n’affiche aucun salon fictif.

Les préférences et profils de démonstration utilisent localStorage. L’identité et les résultats d’un invité utilisent sessionStorage et disparaissent à la fin de sa session de navigation. Les informations légales et coordonnées restent à compléter avant publication.

## Vérifications

Les tests React couvrent la structure de l’accueil, les trois actions, FR/EN, le thème, le compte de démonstration et ses paramètres, les erreurs de frappe, la fin de course, le rejeu et les salons privés persistants. La compilation Next.js est vérifiée. Le nouveau lobby est aussi vérifié dans Chrome avec deux contextes isolés, des captures ordinateur/tablette/jour/nuit et des tests d’invitations à usage unique.

Installation conforme aux documentations officielles :
- https://nextjs.org/docs/app/getting-started/installation
- https://tailwindcss.com/docs/installation/framework-guides/nextjs

## Jour et nuit

Le thème sombre affiche des variantes aux yeux fermés pour les six animaux de la jungle et le guépard du footer. Le guépard au sol reste endormi dans les deux thèmes. Le fond utilise une variante bleu nuit, sans voile noir. Les images jour/nuit ont les mêmes dimensions ; les placements et animations sont conservés. Les prompts sont dans `public/assets/NIGHT-PROMPTS.md`.

Le panneau central comprend trois planches de bois séparées, suspendues à deux cordes continues. Chaque planche est un vrai lien. Un léger balancement commun conserve leur alignement ; il se met en pause au survol ou au focus et est désactivé avec prefers-reduced-motion. Le bois est dessiné dans le composant React SignBoard.


## Connexion et inscription

- `/login` : Discord, GitHub, séparateur « ou », nom d’utilisateur et mot de passe, jouer en invité.
- `/signup` : mêmes fournisseurs, pseudo, mot de passe et confirmation.
- Carte papier aux couleurs GUÉPARD avec un guépard accroché en haut, un singe et un crocodile à gauche, un perroquet et un éléphant à droite. Le mode sombre conserve le ciel bleu nuit et les animaux aux yeux fermés.
- La validation et l’affichage/masquage des mots de passe fonctionnent. L’inscription crée un compte dans `guepard_users` ; le mot de passe est haché avec `scrypt` et un sel aléatoire. La connexion crée une session dans `guepard_sessions` avec un cookie `HttpOnly`, `SameSite=Lax` ; la déconnexion révoque la session. Le navigateur ne conserve pas le mot de passe.
- Discord/GitHub indiquent que leur connexion n’est pas encore configurée. Ils nécessitent les identifiants OAuth correspondants.
- Les nouveaux assets et prompts sont documentés dans `public/assets/AUTH-PROMPTS.md`.

Le site utilise React, Next.js et Tailwind CSS. **Vite et Vitest ont été retirés**, y compris des dépendances transitives. Les tests de développement utilisent Jest et React Testing Library. Les fichiers de l’ancienne compilation Vite ne sont plus dans le projet.

## Lobby de jungle et identité animale

- `/create` : création d’une course publique par défaut, avec choix possible de visibilité semi-publique ou privée. Le choix d’un des six animaux est obligatoire : guépard, perroquet, crocodile, singe, éléphant ou toucan. Chaque animal a son propre paysage illustré dans `public/assets/race-*.png`. Le carrousel de modèles se parcourt au défilement ou avec les flèches.
- `/signup` : choix défilant d’un portrait personnel parmi six animaux, distinct de l’animal et du paysage du salon. Une variante aux yeux fermés apparaît en mode nuit. Le choix est appliqué au compte de démonstration. L’authentification réelle reste à brancher.
- Invité : guépard attribué par le serveur ; pseudo et résultats locaux limités à la session.
- `/lobby/:id` : disposition en deux panneaux clairs et souples inspirée de l’aperçu fourni, avec grain de feutre, relief doux, joueurs et spectateurs distincts, réglages dépliables, animaux réutilisés de l’accueil et footer existant. Aucun emoji décoratif ajouté. Animations séparées des contrôles, pause du singe/toucan au focus et respect de la réduction des animations.
- Seul l’hôte configure, désigne les spectateurs, ajoute des bots, choisit leur niveau individuel et retire les participants. Le minimum est deux joueurs, bots inclus ; les spectateurs ne comptent pas. Pas de validation « prêt » ni de plafond fixe de participants. Un groupe de 32 personnes a été testé via l’API.
- Public : carte visible dans `/races`. Semi-public : code à saisir. Privé : lien généré par l’hôte, valable 30 minutes, consommé atomiquement à la première utilisation. L’hôte peut générer une nouvelle invitation par personne.
- Synchronisation : flux SSE authentifié par jeton de membre, avec reconnexion automatique. Le serveur relit les données toutes les 600 ms et pousse les révisions ; le navigateur ne recharge pas la page. Jetons dans sessionStorage, jamais inclus dans la liste des participants. Un retrait révoque l’accès ; quitter comme hôte ferme le salon.
- Départ commun immédiat, texte aléatoire conforme aux options, progression partagée, bots avec variations et erreurs simulées, abandon après inactivité de frappe, résultats simples et retour au salon. La saisie en cours est restaurée après rechargement. Une arrivée après le départ est spectatrice jusqu’à la prochaine course.
- La nouvelle interface du lobby est actuellement en français ; le header conserve son sélecteur FR/EN. La traduction intégrale de ce nouvel écran, les bonus de jeu et les statistiques avancées/heatmaps du cahier des charges restent des travaux distincts.

## Pistes et podium du salon partagé

Pendant la course, les pistes restent dans l’ordre des participants, au-dessus de la saisie. La position représente la progression validée ; le pseudo et la couleur restent fixes. Le classement utilise l’ordre d’arrivée, puis la progression, avec les abandons à la fin et un rang partagé en cas d’égalité. Aucun bonus ne modifie ce classement.

Tous partent en guépards. Les espèces suivent ensuite le rang : guépard, gazelle, lièvre, puis paliers renard/panda et tortue en dernier. À deux joueurs : guépard/tortue ; à trois : guépard/gazelle/tortue. Un changement doit persister 900 ms ; une égalité temporaire conserve l’espèce précédente. Le podium reprend les participants réels et cette même règle. La revanche réinitialise les apparences. Les animations respectent la réduction des mouvements.

L’atlas transparent `public/assets/race-runners.png` a été généré pour ce projet : six animaux de profil tournés vers la droite, volumes arrondis, texture de feutre et crayon, contours artisanaux, grille 3 × 2 (guépard, gazelle, lièvre / renard, panda, tortue), marge autour de chaque silhouette. Les positions et transformations restent des éléments d’interface indépendants.

Le test `tests/e2e/visual-race.spec.ts` vérifie les dépassements, égalités, pistes fixes, podium, revanche et largeur mobile. `tests/race-ranking.test.jsx` couvre les règles de classement et de transformation.

## Stockage PostgreSQL

Sans base configurée, `.data/rooms.json` conserve les salons entre redémarrages. Le fichier est ignoré par Git. Ce mode est destiné à une seule instance Node locale. Les salons expirent après 24 h et sont nettoyés lors d’une nouvelle création.

En local, `docker compose up -d db` démarre PostgreSQL 16 sur `127.0.0.1:5433` avec un volume persistant. Copier `.env.example` vers `.env.local` puis redémarrer Next.js : `DATABASE_URL` active la base. Le mot de passe d’exemple est réservé au développement local ; pour un autre environnement, définir `GUEPARD_DB_PASSWORD` dans Compose et utiliser le même mot de passe dans `DATABASE_URL`. Le serveur crée la table `guepard_rooms` et sérialise les modifications des salons. `node --env-file=.env.local scripts/migrate-rooms-to-postgres.mjs` importe les anciens salons de `.data/rooms.json` sans remplacer ceux déjà présents. Pour arrêter la base : `docker compose stop db` ; `docker compose down` conserve le volume.

Les commandes courtes sont `npm run db:up`, `npm run db:stop` et `npm run db:migrate`. Après `npm run db:up`, lancer `npm run dev`, puis ouvrir `http://localhost:5173/login` ou `/signup`. Pour voir les tables : `docker compose exec db psql -U guepard -d guepard -c '\dt'`. Les tables `guepard_users`, `guepard_sessions` et `guepard_rooms` sont créées automatiquement. Pour héberger le site ailleurs, `localhost` ne suffit pas : il faut une base PostgreSQL accessible au serveur déployé et sa variable `DATABASE_URL`.

Le serveur Next.js doit rester actif et accessible aux participants. Sur un autre appareil, ouvrir l’adresse réseau du serveur plutôt que `localhost`. Les droits sur un salon reposent sur un jeton de session anonyme, indépendamment de la future authentification des comptes.

## Tests du lobby

```sh
npm test
npm run typecheck
npm run test:e2e
npm run build
```

Les tests Playwright utilisent Chrome installé sur macOS s’il est présent, ou le navigateur Playwright par défaut. `PLAYWRIGHT_CHROME_PATH` permet de préciser un autre exécutable ; ailleurs, installer Chromium avec `npx playwright install chromium`. Les tests créent des salons temporaires sur le serveur local. Les captures de vérification sont enregistrées sous `/tmp/guepard-lobby-*.png`.

## Guide, foulées et résultats

`/how` présente quatre étapes illustrées, une navigation active et les liens vers le jeu rapide et la création. Les sprites `race-gaits.png` contiennent quatre poses distinctes par espèce ; `sleeping-tail.png` anime la queue du guépard endormi. Les prompts et les références sont dans `public/assets/PLAY-EXPERIENCE-PROMPTS.md`. Les foulées cessent à l’arrêt et respectent la réduction des animations. Elles ne modifient jamais la progression serveur.

Le podium du salon partagé affiche vitesse et précision. Le score reste non calculé : sa formule et le départage définitif sont à définir. Le classement indicatif conserve l’ordre d’arrivée puis la progression, avec égalités partagées. L’heure de fin est enregistrée par le serveur. La revanche est une action atomique réservée à l’hôte. Les résultats personnels alimentent les statistiques locales ; la heatmap compte les touches attendues et les erreurs de saisie sur cet appareil et cette session. Aucun historique de frappes distantes n’est inventé.

## Écran Résultats

`RaceResults.tsx` utilise `race-results.ts` comme source unique pour les marches, le tableau et les indicateurs personnels. Les abandons ne montent pas sur le podium et les spectateurs ne sont pas des concurrents. Les bots sont identifiés comme simulés. Le tableau reste défilant pour une classe. La heatmap locale distingue cinq niveaux et permet AZERTY, QWERTY ou BÉPO ; les détails sont disponibles au survol et au focus. Les invités gardent l’accès à leurs statistiques de session. Les tests couvrent aussi deux concurrents, la consultation spectateur et le refus serveur d’une revanche non autorisée.

### Démonstration du podium

Ouvre `/demo/podium` pour comparer la composition avec quatre participants fictifs, clairement indiqués comme tels. Le podium d’une vraie course utilise toujours ses propres résultats.
