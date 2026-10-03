# GUÉPARD — React, Next.js et Tailwind CSS

Site React avec serveur de salons Next.js, avec les illustrations, le mode nuit et les animations de la jungle conservés.

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

La création passe désormais par `/api/lobbies` et ouvre `/lobby/:code`. Le salon est partagé entre les navigateurs qui utilisent la même instance Next.js. Les anciens salons locaux restent consultables sur `/race/:id`. Les cartes de courses de démonstration historiques restent fictives.

Les données de démo et préférences sont stockées dans localStorage et peuvent être réinitialisées depuis Confidentialité. Les informations légales et coordonnées restent à compléter avant publication.

## Vérifications

Les tests React couvrent la structure de l’accueil, les trois actions, FR/EN, le thème, le compte de démonstration et ses paramètres, les erreurs de frappe, la fin de course, le rejeu et les salons privés persistants. La compilation Next.js est vérifiée. Aucune validation visuelle complète par navigateur automatisé n’est revendiquée.

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

## Salons partagés

- `/private` crée un salon et attribue à son créateur un jeton d’hôte ; `/races` permet de saisir un code et liste les vrais salons publics en plus des exemples historiques.
- `/lobby/:code` affiche participants, rôles joueur/spectateur, bots, paramètres et lancement. Copier le code ou le lien permet de rejoindre le salon depuis un autre navigateur qui accède au même serveur. Sur un autre appareil, utiliser une adresse réseau accessible plutôt que localhost.
- Synchronisation par requête toutes les secondes, sans chevauchement des requêtes. Les mises à jour obsolètes sont ignorées grâce au numéro de révision.
- Le serveur vérifie les jetons et réserve paramètres, retrait des participants, départ et retour au salon à l’hôte. Les jetons ne sont jamais exposés dans les listes ; chaque navigateur les garde en sessionStorage. Un participant retiré perd son accès. Un départ volontaire de l’hôte ferme le salon.
- Les salons semi-publics et privés se rejoignent par code/lien et restent absents de la liste publique. Aucune invitation nominative n’est implémentée.
- Départ commun après 3 secondes ; texte généré selon les options, mode spectateur, erreurs bloquantes, limite de temps et progression simulée des bots selon leur difficulté. La saisie et les résultats individuels restent locaux : les positions en direct des autres joueurs ne sont pas encore partagées.
- Stockage **en mémoire du processus Next.js** : expiration après 24 h, perte des salons au redémarrage, maximum 200 salons et 16 places par salon. Pour un déploiement sur plusieurs instances, remplacer ce stockage par une base partagée et ajouter une gestion durable des sessions et de la présence. Fermer un onglet ne retire pas automatiquement son participant.
- Le nouveau salon est rédigé en français. L’accueil et les pages existantes conservent leurs traductions.
- Tests : droits hôte/participant, synchronisation, retrait et révocation, visibilité, configuration du texte, contrôle de démarrage et interface en lecture seule.
