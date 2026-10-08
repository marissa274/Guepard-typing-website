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
5. Dans **Deployments / View Logs**, attendre le message indiquant que Next.js est prêt. Les tables `guepard_users`, `guepard_sessions` et `guepard_rooms` sont créées automatiquement au premier accès ; il n'y a pas de migration ORM à configurer pour ce prototype.

Le script `start` écoute `0.0.0.0` sur le port `PORT` fourni par Railway. Ne pas imposer le port local `5173` dans les réglages Railway.

## 5. Obtenir l'adresse HTTPS

Dans le service web : **Settings → Networking → Public Networking → Generate Domain**. Ouvrir l'adresse `https://…up.railway.app` créée par Railway. Railway fournit automatiquement le certificat HTTPS pour ce domaine.

Dans les variables du **service web**, définir `APP_URL` avec cette adresse publique complète, par exemple `https://guepard-typing-website-production.up.railway.app`, puis redéployer. Le contrôle d’origine reconnaît aussi automatiquement `RAILWAY_PUBLIC_DOMAIN` lorsqu’il est fourni par Railway. Cela évite de comparer l’origine HTTPS du navigateur à l’adresse HTTP interne de Next.js derrière le proxy. Ne pas désactiver ce contrôle ni autoriser tous les domaines.

## 6. Vérifier les parcours

1. Ouvrir l'accueil et `/signup`, puis créer un compte de test.
2. Créer un salon semi-public et copier son code.
3. Ouvrir l'adresse dans un autre navigateur ou une fenêtre privée, rejoindre le salon avec le code et vérifier que les deux personnes se voient.
4. Modifier un réglage comme hôte : l'autre navigateur doit le recevoir. Lancer une course, vérifier les pistes, puis les résultats.
5. Après un redéploiement, vérifier que le compte et le salon persistent. Si l'inscription indique « base de données indisponible », revenir à la variable `DATABASE_URL` du service web.
6. Remplacer `**à renseigner après déploiement**` dans `CHECKPOINT-1.md` par la vraie adresse HTTPS et retirer la mention de brouillon avant la remise.

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
