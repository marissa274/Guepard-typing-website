# Vérification fonctionnelle — 18 novembre 2026

Ce bilan porte sur le code du commit `6fcde08` (`feat: finalize multiplayer rules accounts and race statistics`), créé sans signature. Il distingue les contrôles exécutés localement des vérifications externes restant à effectuer. Il ne certifie ni le déploiement public HTTPS, ni une exécution distante de GitHub Actions, ni la configuration des applications OAuth.

## Résultats

| Contrôle | Résultat observé | Portée |
| --- | --- | --- |
| Installation propre Linux | Réussite avec Node 22.23.5 et npm 10.9.9 | `package.json` et lockfile copiés dans un dossier temporaire ; `npm ci` sans `node_modules` existant, puis installation avec cache hors ligne. L’erreur de désynchronisation du lockfile n’est pas reproduite. |
| `npm run lint` | Réussite, aucun avertissement | Sources, scripts et tests ; règle interdisant les `any` explicites. |
| `npm run typecheck` | Réussite | TypeScript strict pour les sources applicatives et scripts. |
| `npm test -- --silent` | 148 tests réussis dans 26 suites | Moteur, bots, bonus, identités, permissions, stockage, corpus, mesures, HTTP, OAuth simulé et interfaces. |
| `npm run build` | Réussite avec Next.js 16.4.6 | Compilation de production. |
| Parcours Playwright | 22 tests réussis en 3,1 minutes | Passe finale sur la compilation de production, avec Chrome et PostgreSQL isolé ; passage invité vers compte inclus. |
| Migrations SQL | 3 migrations appliquées, puis 0 lors de la deuxième passe | Base PostgreSQL temporaire ; contrôle d’idempotence. |
| Seed | 12 entrées de corpus, 1 compte et 3 courses de démonstration conservés après relance | Données de démonstration identifiées comme synthétiques ; aucune duplication constatée. |
| `npm audit --omit=dev --json` | 0 vulnérabilité de production signalée | Résultat du registre à la date de cette vérification ; ne constitue pas un audit exhaustif de l’application. |

La validation utilise un serveur de production sur `http://localhost:5191` et une base PostgreSQL 16 temporaire distincte de la configuration locale de l’auteur. Les comptes, salons et courses des scénarios sont des données de test.

## Parcours vérifiés en navigateur

- Inscription, reconnexion, profil persistant, conflit de pseudo, changement de mot de passe et révocation des autres sessions.
- Téléversement d’une vraie image, refus d’un fichier invalide, recadrage, persistance et suppression de la photo.
- Création authentifiée, recherche publique, filtres, partie rapide sans création implicite, capacité de trente joueurs, spectateurs, invitations, expulsion et transfert de l’hôte.
- Passage d’un invité signé vers un compte sans doubler sa présence ; conflit intersalons conservé et présence libérée à la déconnexion.
- Corpus PostgreSQL, complexité, paramètres de caractères et rejet d’un saut de progression impossible.
- Décompte, frappe réelle, progression des bots, abandon, échéance, classement, revanche et recommandation de clavier physique sur mobile.
- Courbes temporelles, heatmap personnelle, record, permissions spectateur et snapshots ne dévoilant pas les données privées des autres participants.
- Onze courses réelles terminées, historique paginé, déconnexion/reconnexion et réouverture après fermeture du salon.
- Préférences de langue et de thème, guide, réduction des animations et largeurs mobiles couvertes par les scénarios.

## Mesures de l’accueil

Lighthouse 13.6.0 a été exécuté sur la compilation de production locale, avec sa simulation mobile par défaut et Chrome en mode headless. Ces mesures locales ne garantissent pas les performances du déploiement public.

| État mesuré | Performance | Accessibilité | Bonnes pratiques | SEO |
| --- | ---: | ---: | ---: | ---: |
| Avant optimisation des ressources | 35 | 100 | 96 | 92 |
| Avant PERF-01 (thème sombre) | 74 | 100 | 100 | 92 |
| Version finale, thème sombre (médiane de 3) | 91 | 100 | 100 | 100 |
| Version finale, thème clair (médiane de 3) | 93 | 100 | 100 | 100 |

Les images servies via l’optimisation Next.js et les polices locales avaient ramené le transfert de 8 660 Kio à 1 343 Kio. Le rapport à 74 mesurait un LCP simulé de 8,9 secondes : le fond du ciel attendait près de 1 Mio de planches décoratives en CSS (animaux, feuillage, guépard, branche, guépard du pied de page servi en WebP brut de 1,5 Mio en thème clair) et tout le JavaScript de l’application.

Corrections `PERF-01` : formats AVIF puis WebP pour `/_next/image`, largeurs des planches CSS adaptées au téléphone, guépard du pied de page passé par l’optimiseur, planches décoratives chargées seulement après l’affichage du fond (`data-decor` dans `app/layout.tsx`, rendu final inchangé), vues autres que l’accueil chargées à la demande avec `next/dynamic`, et `robots.txt` valide. Mesures du 18 novembre 2026 sur `next start -p 5199`, commande ci-dessous avec `--form-factor=mobile` (le thème clair est forcé par `--blink-settings=preferredColorScheme=1`) : performance 93, 90 et 91 en thème sombre, 92, 93 et 94 en thème clair ; LCP simulé de 3,1 à 3,4 s, TBT de 60 à 160 ms, CLS 0, transfert de 629 Kio. **Le seuil de 90 est atteint localement** ; la marge reste faible et doit être confirmée sur le déploiement public.

Le [rapport JSON archivé](verification/lighthouse-accueil.json) conserve les paramètres et résultats détaillés. Il correspond à la mesure médiane du thème sombre (91).

## Reproduire les contrôles

Préparer `DATABASE_URL`, `AUTH_SECRET` et `APP_URL` dans l’environnement de test, selon [le guide d’installation](installation/comptes-et-base.md), puis exécuter :

```sh
npm ci
npm run lint
npm run typecheck
npm test -- --silent
npm run db:migrate:sql
npm run db:migrate:sql
npm run db:seed
npm run db:seed
npm run build
GUEPARD_TEST_PORT=5191 npm run test:e2e
npm audit --omit=dev --json
```

Playwright peut démarrer le serveur de production sur le port isolé. Il réutilise un serveur déjà présent : vérifier que celui-ci emploie la compilation et la base à contrôler. Sur une machine sans navigateur local configuré, installer Chromium avec `npx playwright install chromium`.

Pour Lighthouse, laisser tourner le serveur de production seul, sans suite navigateur concurrente :

```sh
npx lighthouse http://localhost:5191 \
  --chrome-flags='--headless' --quiet \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html --output-path=/tmp/guepard-lighthouse
```

`CHROME_PATH` permet de préciser l’exécutable Chrome si nécessaire. Les rapports temporaires locaux et les journaux de cette session ne remplacent pas les preuves à joindre au dossier de remise.

## Limites conservées

Les applications Discord/GitHub et l’hébergement n’étant pas configurés, les flux OAuth sont vérifiés avec des réponses simulées ; le consentement et les callbacks publics réels restent à essayer après activation. Le code et les instructions ont été préparés conformément au choix de l’auteur.

La capacité de trente joueurs est vérifiée, mais la fluidité de trente navigateurs simultanés n’a pas été mesurée. Le score automatique d’accessibilité de l’accueil ne remplace pas un audit manuel de toutes les pages, des contrastes et du clavier. La centralisation complète des libellés bilingues et l’audit de tous les formats de nombre restent partiels.

Le travail visuel, la démarche personnelle du nom et du logo, les informations légales et l’URL de remise restent à compléter par l’auteur. Les statuts détaillés sont dans [EXIGENCES.md](EXIGENCES.md) ; l’architecture et l’utilisation des agents sont décrites dans [ARCHITECTURE.md](ARCHITECTURE.md) et [IA.md](IA.md).
