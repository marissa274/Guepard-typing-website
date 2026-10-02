# GUÉPARD — React, Next.js et Tailwind CSS

Interface frontend bilingue, avec les illustrations, le mode nuit et les animations de la jungle conservés.

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

Les chemins `/races`, `/private`, `/race/:id`, `/how`, `/stats` et les pages d’information sont accessibles directement. Les anciens liens `#/…` sont redirigés vers les nouveaux chemins. Les préférences existantes `guepard-*` sont reprises.

## Démonstration et futur backend

L’authentification reste explicitement un compte de démonstration. Les courses publiques et les adversaires sont fictifs ; la saisie, la précision, le chronomètre et les résultats sont calculés localement.

La création d’une course privée produit un salon local avec un nom, une langue et un identifiant. Il est conservé sur cet appareil après rechargement. Il ne permet pas encore d’inviter des joueurs sur d’autres appareils ; aucun lien d’invitation fonctionnel n’est simulé. Un backend sera nécessaire pour l’authentification, les invitations et le multijoueur en temps réel.

Les données de démo et préférences sont stockées dans localStorage et peuvent être réinitialisées depuis Confidentialité. Les informations légales et coordonnées restent à compléter avant publication.

## Vérifications

Les tests React couvrent la structure de l’accueil, les trois actions, FR/EN, le thème, le compte de démonstration et ses paramètres, les erreurs de frappe, la fin de course, le rejeu et les salons privés persistants. La compilation Next.js est vérifiée. Aucune validation visuelle complète par navigateur automatisé n’est revendiquée.

Installation conforme aux documentations officielles :
- https://nextjs.org/docs/app/getting-started/installation
- https://tailwindcss.com/docs/installation/framework-guides/nextjs

## Jour et nuit

Le thème sombre affiche des variantes aux yeux fermés pour les six animaux de la jungle et le guépard du footer. Le guépard au sol reste endormi dans les deux thèmes. Le fond utilise une variante bleu nuit, sans voile noir. Les images jour/nuit ont les mêmes dimensions ; les placements et animations sont conservés. Les prompts sont dans `public/assets/NIGHT-PROMPTS.md`.

Le panneau central comprend trois planches de bois séparées, suspendues à deux cordes continues. Chaque planche est un vrai lien. Un léger balancement commun conserve leur alignement ; il se met en pause au survol ou au focus et est désactivé avec prefers-reduced-motion. Le bois est dessiné dans le composant React SignBoard.
