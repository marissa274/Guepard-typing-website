# Guépard

Jeu de course de frappe multijoueur, en français et en anglais. Cette tranche privilégie les fonctionnalités ; la refonte visuelle et les preuves personnelles de création restent à préparer.

## Démarrage local

Prérequis : Node.js 22.18+ (ou 24), npm, Docker pour PostgreSQL.

```sh
npm ci
cp .env.example .env.local
npm run db:up
npm run db:migrate:sql
npm run db:seed
npm run dev
```

Ouvrir http://localhost:5173. Vérifier les variables de `.env.local` avant de lancer les commandes : `DATABASE_URL`, `AUTH_SECRET` et `APP_URL` sont expliquées dans [le guide d’installation](docs/installation/comptes-et-base.md). Le mot de passe Compose doit correspondre à celui de `DATABASE_URL`. Si un volume PostgreSQL existe déjà, changer une variable ne change pas son mot de passe enregistré.

Le seed idempotent ajoute 12 corpus FR/EN et le compte local public **GuepardDemo / GuepardDemo2026!**, avec trois courses synthétiques clairement nommées. En production, fournir `GUEPARD_DEMO_PASSWORD`. Ne jamais réutiliser un mot de passe personnel pour ce compte de correction.

`npm run db:migrate` importe les anciens salons JSON ; cette commande est distincte des migrations SQL versionnées. `npm run db:stop` arrête la base sans supprimer son volume.

## Fonctionnalités

- Comptes par mot de passe, sessions PostgreSQL, profil, changement de mot de passe et photo JPEG/PNG/WebP recadrée côté serveur. Flux OAuth GitHub/Discord préparés ; leur activation exige vos applications et variables privées.
- Salons publics, sur code ou privés ; capacité de 2 à 30 joueurs, spectateurs, invitations révocables, présence unique et transfert de l’hôte. Les invités utilisent une identité signée et ne créent pas de salon.
- Corpus en base, trois complexités, textes FR/EN cohérents ou aléatoires, paramètres de caractères, durée et correction. Les options d’inclusion/exclusion concernent les mots aléatoires.
- Décompte serveur de trois secondes, progression contrôlée, cinq niveaux de bots déterministes, abandon et reconnexion, bonus de remontée facultatifs. Une course commencée refuse les nouvelles entrées.
- Résultats avec MPM net/brut, précision, erreurs, bonus, courbes temporelles réellement collectées et heatmap personnelle. Historique PostgreSQL paginé, consultation après fermeture du salon et annonce de record personnel. Les invités gardent des statistiques de session.
- Interface FR/EN, préférence de langue conservée en cookie, thème initial selon le système. Sur petit écran, la course recommande un clavier physique ; les résultats restent accessibles.

Les principaux chemins sont `/`, `/login`, `/signup`, `/play`, `/create`, `/races`, `/lobby/:id`, `/how`, `/stats` et `/history/:id`. `/demo/podium` est une démonstration explicitement fictive. Les anciens parcours locaux `/race/:id` sont conservés pour compatibilité ; les courses partagées passent par `/lobby/:id`.

## Vérifications

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright emploie Chrome local sur macOS s’il est disponible, sinon Chromium Playwright ; `PLAYWRIGHT_CHROME_PATH` permet de choisir l’exécutable. Préparer la base avant les tests. Pour tester la compilation de production sur un port distinct, fournir `GUEPARD_TEST_PORT=5191`, `DATABASE_URL` et `AUTH_SECRET` à la commande Playwright. Les scénarios créent leurs propres comptes et salons.

La CI versionnée prépare PostgreSQL, installe avec `npm ci`, lance lint, typage strict, tests, migrations, seed, build et parcours navigateur. Son exécution distante et le déploiement HTTPS doivent être vérifiés sur les services réels.

## Documentation

- [Architecture et sécurité](docs/ARCHITECTURE.md)
- [Installation, OAuth et photos](docs/installation/comptes-et-base.md)
- [Exigences et limites de remise](docs/EXIGENCES.md)
- [Utilisation des agents IA](docs/IA.md)
- [Bots et choix de simulation](docs/fonctionnalites/bots.md)
- [Guide de déploiement Railway](docs/deploiement-railway.md)

Les documents `CHECKPOINT-1.md` et `docs/livrables/*checkpoint-1.pdf` décrivent un état historique. Ils ne constituent pas le bilan de cette tranche. La démarche personnelle du nom/logo, les coordonnées légales, l’URL publique et les preuves de correction doivent être complétées par l’auteur.
