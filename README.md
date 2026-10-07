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

La page `/races` présente trois grandes cartes de jungle illustrées (canopée, rivière, clairière dorée), avec paysages en pleine surface, grands textes contrastés, boutons directement sur les cartes et superposition native au défilement via `position: sticky`. Sur les écrans trop courts et avec `prefers-reduced-motion`, les cartes défilent normalement pour préserver la lisibilité. Les courses restent celles de la démonstration existante. Les illustrations et leurs prompts sont documentés dans `public/assets/RACE-PROMPTS.md`.

Un header avec le logo original agrandi, une seule scène de jungle, puis le footer. Le tableau central contient trois liens accessibles : rejoindre une course, créer une course privée, parcourir les courses. Les assets, les animations CSS, les profondeurs et la préférence de réduction des mouvements sont conservés. Tailwind gère les mises en page des nouveaux éléments sans appliquer de reset à la direction artistique existante.

## Architecture

- `app/layout.jsx` : document Next.js et état partagé.
- `app/[[...path]]/page.jsx` : point d’entrée App Router ; navigation avec `next/link`.
- `src/components/` : composants React de la scène, du header, du footer, des courses, du jeu et des fenêtres de démonstration.
- `src/hooks/useParallax.js` : parallaxe bornée, avec nettoyage des événements et respect de `prefers-reduced-motion`.
- `src/data.js` : adaptateur de démonstration pour les courses publiques, textes et salons privés ; à remplacer par une API.
- `src/i18n.js` : traductions partagées.
- `app/globals.css` : Tailwind CSS et ajustements de la pancarte/logo.
- `src/style.css`, `src/jungle.css` : styles et animations historiques préservés.
- `public/assets/` : illustrations et documents des prompts.

Les chemins `/login`, `/signup`, `/races`, `/private`, `/race/:id`, `/how`, `/stats` et les pages d’information sont accessibles directement. Les anciens liens `#/…` sont redirigés vers les nouveaux chemins. Les préférences existantes `guepard-*` sont reprises.

## Démonstration et futur backend

L’authentification reste explicitement un compte de démonstration. Les courses publiques et les adversaires sont fictifs ; la saisie, la précision, le chronomètre et les résultats sont calculés localement.

La création de course ouvre désormais un salon partagé `/lobby/:id`. Les paramètres, participants et départ sont synchronisés entre navigateurs. Les cartes historiques restent des démonstrations lorsqu’aucun salon public n’est ouvert.

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
- La validation des champs fonctionne, ainsi que l’affichage/masquage des mots de passe et le parcours de démonstration. Aucun identifiant n’est vérifié par un serveur ; aucun compte réel n’est créé. Aucun mot de passe n’est stocké ou transmis.
- Discord/GitHub indiquent explicitement que leur authentification n’est pas encore configurée. `src/services/auth.js` est le point de remplacement pour les futurs appels serveur.
- Les nouveaux assets et prompts sont documentés dans `public/assets/AUTH-PROMPTS.md`.

Le site utilise React, Next.js et Tailwind CSS. **Vite et Vitest ont été retirés**, y compris des dépendances transitives. Les tests de développement utilisent Jest et React Testing Library. Les fichiers de l’ancienne compilation Vite ne sont plus dans le projet.

## Lobby de jungle et identité animale

- `/private` : création d’un salon, avec choix obligatoire parmi guépard, perroquet et crocodile. Le catalogue `src/lib/animals.ts` lie ces animaux aux paysages `race-sun.png`, `race-canopy.png` et `race-river.png`. Aucune image libre n’est requise ni acceptée pour les cartes.
- `/signup` : choix d’un avatar personnel distinct de l’animal du salon. Le choix est appliqué au compte de démonstration. L’authentification réelle Discord/GitHub et par mot de passe reste à brancher ; l’interface le précise.
- Invité : guépard attribué par le serveur ; pseudo et résultats locaux limités à la session.
- `/lobby/:id` : header existant, deux tableaux de bois clair, réglages dépliables, animaux réutilisés de l’accueil, footer existant. Aucun emoji décoratif ajouté. Animations séparées des contrôles, pause du singe/toucan au focus et respect de la réduction des animations.
- Seul l’hôte configure, désigne les spectateurs, ajoute des bots, choisit leur niveau individuel et retire les participants. Le minimum est deux joueurs, bots inclus ; les spectateurs ne comptent pas. Pas de validation « prêt » ni de plafond fixe de participants. Un groupe de 32 personnes a été testé via l’API.
- Public : carte visible dans `/races`. Semi-public : code à saisir. Privé : lien généré par l’hôte, valable 30 minutes, consommé atomiquement à la première utilisation. L’hôte peut générer une nouvelle invitation par personne.
- Synchronisation : flux SSE authentifié par jeton de membre, avec reconnexion automatique. Le serveur relit les données toutes les 600 ms et pousse les révisions ; le navigateur ne recharge pas la page. Jetons dans sessionStorage, jamais inclus dans la liste des participants. Un retrait révoque l’accès ; quitter comme hôte ferme le salon.
- Départ commun après 4 secondes, texte aléatoire conforme aux options, progression partagée, bots avec variations et erreurs simulées, abandon après inactivité de frappe, résultats simples et retour au salon. La saisie en cours est restaurée après rechargement. Une arrivée après le départ est spectatrice jusqu’à la prochaine course.
- La nouvelle interface du lobby est actuellement en français ; le header conserve son sélecteur FR/EN. La traduction intégrale de ce nouvel écran, les bonus de jeu et les statistiques avancées/heatmaps du cahier des charges restent des travaux distincts.

## Stockage et futur PostgreSQL

Sans base configurée, `.data/rooms.json` conserve les salons entre redémarrages. Le fichier est ignoré par Git. Ce mode est destiné à une seule instance Node locale. Les salons expirent après 24 h et sont nettoyés lors d’une nouvelle création.

Pour PostgreSQL : copier `.env.example` vers `.env.local`, renseigner `DATABASE_URL`, redémarrer Next.js. Le serveur crée la table `guepard_rooms` et utilise des transactions avec verrou pour sérialiser les changements et consommer les invitations une seule fois. Le branchement est implémenté, mais aucune base PostgreSQL n’était disponible pour le tester. Le stockage local n’est pas migré automatiquement.

Le serveur Next.js doit rester actif et accessible aux participants. Sur un autre appareil, ouvrir l’adresse réseau du serveur plutôt que `localhost`. Les droits sur un salon reposent sur un jeton de session anonyme, indépendamment de la future authentification des comptes.

## Tests du lobby

```sh
npm test
npm run typecheck
npm run test:e2e
npm run build
```

Les tests Playwright utilisent Chrome installé sur macOS s’il est présent, ou le navigateur Playwright par défaut. `PLAYWRIGHT_CHROME_PATH` permet de préciser un autre exécutable ; ailleurs, installer Chromium avec `npx playwright install chromium`. Les tests créent des salons temporaires sur le serveur local. Les captures de vérification sont enregistrées sous `/tmp/guepard-lobby-*.png`.
