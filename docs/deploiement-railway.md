# Mettre GUÉPARD en ligne sur Railway

Ce guide utilise le dépôt GitHub configuré dans ce projet : `marissa274/Guepard-typing-website`. Avant de commencer, vérifier qu'il s'agit bien de votre dépôt et que la branche `main` contient les derniers changements. Railway déploie **GitHub**, pas les fichiers encore présents seulement sur cet ordinateur.

## 1. Mettre le code à jour sur GitHub

Dans le dossier `Guepard`, vérifier le dépôt et la branche avec `git remote -v` et `git status -sb`. Le code local peut être en avance sur `origin/main`. Une fois la propriété du dépôt confirmée, envoyer les commits avec `git push origin main`, puis vérifier que le dernier commit apparaît sur la page GitHub du dépôt. Le fichier `.env.local` ne doit pas être envoyé : Railway recevra sa propre variable de base de données.

## 2. Relier GitHub à Railway

1. Ouvrir [Railway](https://railway.com/new) et se connecter avec GitHub.
2. Dans Railway, choisir **New Project** puis **Empty Project** si cette option est proposée.
3. Si Railway demande une autorisation GitHub, choisir le compte qui possède `marissa274/Guepard-typing-website` et autoriser l'accès à ce dépôt.
4. Si le dépôt n'apparaît pas ensuite, ouvrir les paramètres du compte Railway, section **General / Account Integrations / GitHub**, puis **Edit Scope**. Autoriser ce dépôt et revenir au projet.

L'autorisation GitHub se fait dans la page officielle GitHub/Railway. Ne jamais copier un mot de passe ou un jeton dans une conversation.

## 3. Créer PostgreSQL

Sur le canevas du projet Railway : **+ New → Database → PostgreSQL**. Attendre que le service de base soit prêt. Il reste privé ; GUÉPARD n'a pas besoin d'activer l'accès public de la base.

## 4. Ajouter le site Next.js

1. Cliquer sur **+ New → GitHub Repo** et sélectionner `marissa274/Guepard-typing-website`, branche `main`.
2. Si Railway propose **Add Variables** avant le premier déploiement, choisir cette option. Sinon, ouvrir ensuite le service web et son onglet **Variables**.
3. Ajouter une **Reference Variable** nommée `DATABASE_URL` qui pointe vers `DATABASE_URL` du service PostgreSQL. Si l'éditeur brut est utilisé et que le service s'appelle `Postgres`, la référence est `DATABASE_URL=${{Postgres.DATABASE_URL}}` ; choisir le nom exact affiché dans le projet.
4. Lancer le déploiement. Railpack détecte `package.json`, exécute le script `build` et utilise `start`. Les commandes du projet sont `npm run build` et `npm start`.
5. Ajouter `AUTH_SECRET`, un secret privé stable généré pour cet environnement. Définir **Settings → Deploy → Pre-deploy Command** sur `npm run db:migrate:sql`. Les [commandes de pré-déploiement Railway](https://docs.railway.com/deployments/pre-deploy-command) accèdent au réseau privé et aux variables du service ; une migration échouée bloque le déploiement.
6. Pour préparer la démonstration, définir `GUEPARD_DEMO_PASSWORD`, puis exécuter une fois `npm run db:seed` dans l’environnement du service. Ne pas modifier les fichiers de migration déjà appliqués. Les scripts exigent Node 22.18+ ou 24.
7. Dans **Deployments / View Logs**, vérifier migrations puis démarrage de Next.js. Les instructions OAuth et photos sont dans [comptes-et-base.md](installation/comptes-et-base.md).

Le script `start` écoute `0.0.0.0` sur le port `PORT` fourni par Railway. Ne pas imposer le port local `5173` dans les réglages Railway.

## 5. Obtenir l'adresse HTTPS

Dans le service web : **Settings → Networking → Public Networking → Generate Domain**. Ouvrir l'adresse `https://…up.railway.app` créée par Railway. Railway fournit automatiquement le certificat HTTPS pour ce domaine.

Dans les variables du **service web**, définir `APP_URL` avec cette adresse publique complète, par exemple `https://guepard-typing-website-production.up.railway.app`, puis redéployer. Le contrôle d’origine reconnaît aussi automatiquement `RAILWAY_PUBLIC_DOMAIN` lorsqu’il est fourni par Railway. Cela évite de comparer l’origine HTTPS du navigateur à l’adresse HTTP interne de Next.js derrière le proxy. Ne pas désactiver ce contrôle ni autoriser tous les domaines.

## 5 bis. Adresse IP des visiteurs

GUÉPARD n'enregistre jamais l'adresse IP en clair : il en garde une empreinte HMAC (signée avec `AUTH_SECRET`). Elle sert à la limite de 10 essais de code par minute et par IP (SALLE-10), à la liaison d'une invitation à l'IP de son premier utilisateur (SALLE-04) et à l'expulsion d'un invité (SALLE-07).

Next.js n'écrit l'adresse du socket dans `X-Forwarded-For` que si la requête n'a **pas** cet en-tête : sans proxy, toutes ses entrées peuvent donc venir du client. Les route handlers n'exposent pas l'adresse du socket. GUÉPARD ne lit donc une adresse IP que si la configuration déclare d'où elle vient :

- `GUEPARD_CLIENT_IP_HEADER=<en-tête>` : en-tête que la plateforme **écrase** toujours avec l'adresse du client (`X-Real-IP` sur Railway, `CF-Connecting-IP` derrière Cloudflare). Un en-tête simplement transmis serait falsifiable.
- `GUEPARD_TRUST_PROXY=N` (entier de 1 à 10) : **N** proxys successifs ajoutent chacun une entrée à la fin de `X-Forwarded-For` ; l'entrée prise est la N-ième en partant de la droite, les entrées de gauche écrites par le client sont ignorées. Utilisé aussi quand l'en-tête de `GUEPARD_CLIENT_IP_HEADER` manque.
- **Aucune des deux (ou valeur invalide)** : `X-Forwarded-For` est ignoré et tous les visiteurs partagent **une seule empreinte** (limite de codes commune, plus stricte mais jamais contournable). En production, le serveur écrit au démarrage un avertissement `[guepard] AVERTISSEMENT configuration IP client` dans les journaux. En local, ce mode convient.

Les adresses IPv6 sont regroupées par préfixe **/64** (un abonné dispose en général d'un /64 entier et peut changer d'adresse à l'intérieur) ; les adresses IPv4 sont prises entières.

**Configuration Railway** : dans les variables du service web, définir `GUEPARD_CLIENT_IP_HEADER=X-Real-IP` (le proxy de Railway remplace cet en-tête par l'adresse du client) ; on peut ajouter `GUEPARD_TRUST_PROXY=1` comme repli. Avec un CDN devant Railway, utiliser l'en-tête du CDN (`CF-Connecting-IP`) ou `GUEPARD_TRUST_PROXY=2`. Après redéploiement, les journaux ne doivent plus contenir l'avertissement.

Vérification après déploiement :

1. Depuis deux connexions différentes (Wi-Fi et réseau mobile), entrer 11 codes erronés sur la première ; la onzième tentative doit être refusée, alors que la seconde connexion peut encore essayer un code. Si les deux sont bloquées ensemble, l'adresse n'est pas lue (vérifier la variable et l'avertissement au démarrage).
2. Falsification : répéter 11 fois `curl -X POST "$APP_URL/api/rooms" -H "Origin: $APP_URL" -H 'Content-Type: application/json' -H "X-Real-IP: 198.51.100.$RANDOM" -H "X-Forwarded-For: 203.0.113.$RANDOM" -d '{"action":"resolve","code":"ZZZZZZ"}'` depuis la même machine : la onzième réponse doit rester un refus pour trop de tentatives. Sinon la plateforme transmet l'en-tête sans l'écraser : choisir l'autre réglage.

Choix pour l'expulsion (SALLE-07) : l'identité expulsée (compte ou cookie invité) est bannie du salon définitivement. Son empreinte IP est aussi bannie, mais **pendant 10 minutes** et **seulement pour les nouvelles identités invitées**, afin qu'un invité expulsé ne revienne pas aussitôt en effaçant son cookie. Les membres déjà présents dans le salon derrière la même IP (classe, foyer, NAT) ne sont jamais refusés et se reconnectent normalement ; un **compte connecté** de la même IP reste toujours accepté (les comptes sont bannis par leur identité) ; passé 10 minutes, de nouveaux invités de cette IP peuvent rejoindre le salon, y compris par la partie rapide.

## 6. Vérifier les parcours

1. Ouvrir l'accueil et `/signup`, puis créer un compte de test.
2. Créer un salon semi-public et copier son code.
3. Ouvrir l'adresse dans un autre navigateur ou une fenêtre privée, rejoindre le salon avec le code et vérifier que les deux personnes se voient.
4. Modifier un réglage comme hôte : l'autre navigateur doit le recevoir. Lancer une course, vérifier les pistes, puis les résultats.
5. Après un redéploiement, vérifier que le compte et le salon persistent. Si l'inscription indique « base de données indisponible », revenir à la variable `DATABASE_URL` du service web.
6. Consigner la vraie URL HTTPS, le compte de correction et les résultats des parcours publics dans le dossier de remise. `CHECKPOINT-1.md` conserve son rôle de document historique. Vérifier aussi les photos, l’historique et les callbacks OAuth si les fournisseurs sont activés.

Le flux SSE du lobby maintient une connexion ouverte ; si Railway signale des erreurs de connexion ou si les mises à jour cessent, examiner les journaux du service web et les limites de l'offre utilisée.

## Option : accompagnement direct dans Codex

Railway propose un CLI et un serveur MCP officiel pour Codex. Sur ce Mac, le CLI Railway n'est pas encore installé et aucune session Railway n'est connectée à l'assistant. Pour l'activer vous-même :

```sh
brew install railway
railway login --browserless
railway whoami
railway mcp install --agent codex
```

La commande de connexion affiche une URL et un code de jumelage. Ouvrir l'URL dans votre navigateur, entrer le code **sur le site Railway**, puis revenir au terminal. Ne pas envoyer le code ou un jeton dans la conversation. Après l'installation MCP, rouvrir Codex si la connexion n'apparaît pas immédiatement ; l'assistant pourra alors lire le projet Railway auquel le compte donne accès et guider la configuration directement. On peut aussi utiliser `railway link` dans le dossier du projet après avoir créé le projet sur le site.

## Sources officielles

- [Déployer Next.js et PostgreSQL sur Railway](https://docs.railway.com/guides/nextjs)
- [Déployer un dépôt GitHub](https://docs.railway.com/quick-start)
- [Base PostgreSQL Railway](https://docs.railway.com/databases/postgresql)
- [Variables de référence](https://docs.railway.com/variables/reference)
- [Domaine et HTTPS](https://docs.railway.com/networking/public-networking)
- [Port et adresse d'écoute](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond)
- [CLI et connexion Railway](https://docs.railway.com/cli)
- [MCP Railway pour Codex](https://docs.railway.com/cli/mcp)
