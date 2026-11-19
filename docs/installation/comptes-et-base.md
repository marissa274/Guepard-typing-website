# Comptes, OAuth, photos et préparation de la base

Le code permet la connexion par mot de passe et les flux OAuth GitHub/Discord. Les flux externes nécessitent vos propres applications et secrets : aucun identifiant de production n'est livré. Les tests unitaires simulent les réponses des fournisseurs ; leur réussite ne prouve pas que vos applications OAuth sont configurées.

## Préparer PostgreSQL

1. Copier `.env.example` vers `.env.local` et configurer `DATABASE_URL`.
2. Démarrer PostgreSQL local avec `docker compose up -d db`.
3. Appliquer les migrations versionnées : `node --env-file=.env.local scripts/db-migrate.ts`.
4. Ajouter les données de démonstration : `node --env-file=.env.local scripts/db-seed.ts`.

Le projet requiert une version Node capable d'exécuter les scripts TypeScript natifs (Node 22.18+ ou 24). Les migrations sont appliquées dans l'ordre, une transaction par fichier, sous verrou PostgreSQL. La table `guepard_migrations` enregistre leur somme SHA-256. Relancer la commande n'applique pas deux fois la même migration ; modifier un fichier déjà appliqué provoque une erreur explicite. Ajouter un nouveau fichier pour toute évolution. Les créations automatiques de tables utilisées par le serveur restent compatibles avec ces migrations.

Le seed ajoute 25 entrées de corpus : 12 entrées originales (français/anglais, trois complexités, phrases et dictionnaires) et 13 extraits du domaine public (source dans la colonne `source`) ; un compte `GuepardDemo` ; trois courses de démonstration datées et identifiées comme telles dans leur nom. Le contenu original du corpus est centralisé dans `src/data/corpus.ts`, avec sa source. Les courses semées contiennent des données synthétiques de classement, courbes et touches, destinées uniquement à démontrer l'interface.

Les insertions sont idempotentes. Aucun compte ni mot de passe existant n'est remplacé. Si le pseudo de démonstration a déjà été pris par un autre compte, la contrainte d'unicité interrompt le seed plutôt que de l'écraser. Le mot de passe public local par défaut est `GuepardDemo2026!`. En production, le script exige `GUEPARD_DEMO_PASSWORD` ; choisissez un mot de passe de démonstration explicitement destiné à être communiqué pour correction, distinct de tous vos comptes personnels. Le script ne l'affiche pas et ne l'enregistre qu'après hachage scrypt.

La variable `GUEPARD_DB_PASSWORD` est utilisée par Compose ; elle doit correspondre au mot de passe de `DATABASE_URL` si vous la changez. Le stockage JSON via `GUEPARD_DATA_DIR` reste réservé au développement à instance unique et ne remplace pas PostgreSQL pour les comptes, OAuth, photos, résultats ou contraintes de salle.

## Identité invitée et URL publique

Générer un secret avec `openssl rand -hex 32` et enregistrer sa valeur uniquement dans `.env.local` ou les variables privées du serveur, sous `AUTH_SECRET`. Il signe le cookie invité et anonymise les empreintes IP. Il doit rester stable entre les redémarrages et être partagé entre instances. En production, il est obligatoire. En développement sans secret configuré, le serveur conserve un secret aléatoire dans `.data/guest-secret` avec des permissions limitées.

Définir `APP_URL` avec l'origine canonique du site, par exemple `https://votre-site.example`, sans chemin. Sur Railway, `RAILWAY_PUBLIC_DOMAIN` peut fournir cette origine si `APP_URL` n'est pas renseigné. OAuth exige HTTPS en production. L'origine n'est jamais tirée d'un en-tête de proxy arbitraire pour construire un callback.

Définir `GUEPARD_CLIENT_IP_HEADER` (en-tête que la plateforme écrase toujours, `X-Real-IP` sur Railway) ou `GUEPARD_TRUST_PROXY=N` (nombre de proxys qui ajoutent une entrée à `x-forwarded-for`). Sans l'un des deux, `x-forwarded-for` est ignoré car un client peut l'écrire, et le serveur utilise une empreinte partagée conservatrice ; en production, il l'annonce par un avertissement au démarrage. Les adresses IPv6 sont regroupées par préfixe /64. La base ne conserve que l'empreinte HMAC de l'IP.

## GitHub

Créer une OAuth App dans les paramètres développeur GitHub. Configurer :

- Homepage URL : la valeur de `APP_URL`.
- Authorization callback URL : `<APP_URL>/api/auth/github/callback`.
- Variables privées : `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET`.

En local, le callback est `http://localhost:5173/api/auth/github/callback`. Utiliser une application locale distincte de celle de production. Le bouton GitHub utilise le flux authorization code, un `state` aléatoire à usage unique lié au navigateur et PKCE S256. Le serveur échange le code et interroge `/user` pour établir l'identité stable à chaque connexion. Aucun accès aux dépôts ni aux adresses courriel n'est demandé. Voir la [documentation officielle GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).

## Discord

Créer une application dans le Developer Portal Discord, puis ajouter le redirect URI exact `<APP_URL>/api/auth/discord/callback` dans OAuth2. Configurer `DISCORD_CLIENT_ID` et `DISCORD_CLIENT_SECRET`. En local, utiliser `http://localhost:5173/api/auth/discord/callback`.

Le flux authorization code confidentiel se limite au scope `identify`. Le `state` est obligatoire et consommé atomiquement. Le secret client reste sur le serveur ; la documentation OAuth2 Discord citée ne décrit pas PKCE pour ce flux web, donc le code ne lui envoie pas de paramètres PKCE non documentés. Voir la [documentation officielle Discord](https://docs.discord.com/developers/topics/oauth2).

Les comptes sont liés uniquement par couple fournisseur/identifiant stable. Un nom ou une adresse courriel identique ne fusionne jamais deux comptes. Une nouvelle connexion OAuth crée un pseudo disponible suffixé, ensuite modifiable dans les paramètres. Le compte OAuth ne reçoit pas de mot de passe implicite. Les jetons d'accès fournisseur servent à vérifier l'identité puis ne sont pas persistés ; seule une session locale est créée. Les états expirent après dix minutes et leurs enregistrements expirés sont nettoyés au démarrage d'un nouveau flux.

Sans variables fournisseur, le bouton signale que sa connexion n'est pas configurée. Après ajout des variables, redémarrer Next.js. Vérifier ensuite manuellement consentement, annulation, reconnexion au même compte et callback depuis l'adresse publique réelle.

## Photo de profil

Dans Paramètres, choisir une photo JPEG, PNG ou WebP de 2 Mo maximum. Le serveur vérifie la taille et le format décodé, refuse les faux types MIME, images corrompues et formats animés, limite le nombre de pixels décodés, puis recadre en WebP 256 × 256 sans recopier les métadonnées. Ce traitement utilise [sharp](https://sharp.pixelplumbing.com/api-input/).

L'image est conservée en PostgreSQL dans `guepard_avatars`, associée au compte connecté. Elle est servie en `image/webp` via `/api/avatars/<id>?v=<version>`, avec `nosniff`. Les photos de profil sont publiques pour pouvoir être affichées aux autres participants. Les écritures et suppressions exigent une session valide et une origine autorisée. L'utilisateur peut supprimer sa photo et conserver son animal comme avatar de remplacement. Aucune clé de stockage externe payant n'est nécessaire.

## Vérifications

- `npm test -- --runTestsByPath tests/oauth-flow.test.tsx tests/avatar-upload.test.tsx tests/account-settings.test.tsx tests/account-settings-ui.test.tsx` : state/cookies, PKCE GitHub, échecs fournisseurs simulés, identité stable, formats d'image réels, compte et formulaire.
- `npx playwright test tests/e2e/auth.spec.ts tests/e2e/account-settings.spec.ts tests/e2e/profile-photo.spec.ts` : comptes temporaires PostgreSQL, profil, changement de mot de passe, révocation de session, téléversement et suppression de photo.
- Exécuter deux fois migrations et seed, puis vérifier que ni les comptes ni les courses de démonstration ne se dupliquent.

Ne pas confondre ces vérifications locales avec une validation d'OAuth en production : celle-ci reste à réaliser avec les applications et secrets effectivement configurés.
