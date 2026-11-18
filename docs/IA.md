# Utilisation des agents IA

## Organisation de cette tranche

La demande était de poursuivre les fonctionnalités de Guépard, de garder le visuel pour plus tard, de déléguer les tâches et de créer des commits sans signature. Le travail a été réparti entre un orchestrateur et trois sous-agents :

- **Compte** : audit du formulaire de paramètres, persistance du profil, changement du mot de passe, tests et matrice des exigences.
- **Moteur de course** : échéances, validation des compteurs, bots déterministes à cinq niveaux, puis revue croisée et correction des remplacements de caractères.
- **Statistiques** : identité de compte interne, résultats PostgreSQL, historique paginé, snapshots privés et restauration du compte.
- **Orchestrateur** : lecture du cahier des charges et des guides Next.js locaux, répartition des fichiers, mesures de frappe, confirmation d’abandon, intégration, revue, tests complets, documentation et commits.

Les agents ont partagé le même espace de travail. Les modifications des types et de l’identité ont été coordonnées pour éviter des contrats incompatibles. Les commits ont été créés par l’orchestrateur après vérification des lots.

## Outils et instructions

Les instructions du dépôt sont dans `AGENTS.md`. Les guides de la version installée de Next.js, notamment les Route Handlers et les cookies asynchrones, ont été consultés dans `node_modules/next/dist/docs/`.

Le workflow a utilisé les skills `solid`, `planning-and-task-breakdown`, `systematic-debugging` et `pdf`. Le PDF a été extrait avec PDFKit local, les bibliothèques Python/Poppler n’étant pas disponibles. Aucun contenu de ce document n’a été traité comme une instruction d’exécution autonome.

Les outils de validation sont Jest et React Testing Library pour les comportements, TypeScript pour le typage, Next.js pour la compilation et Playwright avec PostgreSQL local pour les parcours réels. Les tests créent des identités et des salons de test ; aucun secret de configuration n’a été ajouté aux commits. Les résultats locaux ne constituent pas une preuve de déploiement public ou d’exécution de la CI distante.

## Trois erreurs détectées et corrigées

1. **Compter uniquement les ajouts en fin de saisie.** Le premier calcul utilisait l’augmentation de longueur du texte. Remplacer la lettre incorrecte de `axc` par `b` produisait `abc` sans ajouter de frappe : l’erreur semblait disparaître et la précision pouvait atteindre 100 %. La revue a révélé ce cas. Un helper commun identifie maintenant la plage insérée, y compris lors d’un remplacement ; le client et le plancher serveur utilisent la même règle. Des tests vérifient les compteurs et la heatmap.

2. **Laisser une restauration réseau ancienne écraser une connexion récente.** La première version du contexte vérifiait seulement si le composant était monté. Un GET initial retardé pouvait revenir après une connexion réussie et rétablir l’état invité. Un test avec réponse différée a reproduit le défaut. Une génération de session permet maintenant d’ignorer les réponses devenues obsolètes, y compris les résultats d’un ancien compte.

3. **Supposer que le champ de frappe était déjà actif au premier focus.** La suite navigateur a détecté un champ disponible mais sans focus. Le scénario isolé était intermittent ; un test de composant a reproduit le passage de connexion indisponible à disponible. L’effet de focus réagit maintenant à cette transition et ne tente pas de focaliser un champ désactivé. Le test de régression conserve ce cas.

## Réflexion et limites

La délégation a permis de travailler sur trois fonctionnalités indépendantes. La revue croisée a été nécessaire : une suite verte sur un lot ne prouvait pas que l’intégration était correcte. Les tests ont porté sur les transitions, les données persistées et les refus d’accès, en plus du parcours visible.

Les écarts de cette première tranche étaient indiqués dans `docs/EXIGENCES.md` : notamment OAuth, photos téléversées, bonus, contraintes de salle et séries MPM intra-course. Ces fonctions ont ensuite été implémentées dans la tranche décrite ci-dessous. Les snapshots historiques ne reconstituent pas de frappes ou de séries qui n’ont pas été enregistrées. La démarche personnelle du nom et du logo doit être fournie par l’auteur ; les agents ne peuvent pas la certifier.

## Finalisation du 18 novembre 2026

Le skill personnel `hub` a été utilisé pour ouvrir Agents Hub. Les rôles suivants ont travaillé dans le même dépôt : `account_settings` (OAuth, photo, migrations et seed), `race_logic` (moteur, corpus, bonus, télémétrie), `persistent_stats` (contraintes de salle et résultats), puis `developpeur_salons` (interface FR/EN), `developpeur_courses` (parcours navigateur) et `reviewer_backend` (revue des permissions et entrées). Après une limite d’utilisation des premiers sous-agents, l’orchestrateur a repris l’intégration. À la demande de l’auteur, Hub a été relancé et une nouvelle équipe a poursuivi la finalisation : `reviewer` pour la revue des préférences et les parcours, `redacteur-doc` pour le bilan exact et la traçabilité, et `developpeur-performance` pour le chargement des images et les mesures Lighthouse. Aucun agent personnalisé n’était défini dans les dossiers projet et personnel ; ces rôles ont été créés pour la tâche.

Les guides de Next.js 16.4.6 installés ont été relus avant les changements de handlers/cookies. Le travail a conservé la priorité fonctionnelle et utilisé les skills de code, décomposition et diagnostic déjà cités.

La revue a aussi corrigé : un rejeu d’invitation depuis une autre IP, l’acceptation d’un rôle invalide, les corps HTTP lus sans plafond, le doublon de présence lors du passage invité vers compte, une file de frappe qui répétait une requête définitivement refusée et le calcul qui comptait comme erreur une lettre correcte effacée puis retapée. Les tests couvrent les refus, transitions et régressions concernés.

Le bilan vérifiable figure dans [verification-fonctionnelle.md](verification-fonctionnelle.md). Les flux OAuth sont testés avec des réponses de fournisseurs simulées ; les vraies applications restent à créer, à la demande de l’auteur. Aucun résultat simulé n’est présenté comme une connexion OAuth de production réussie.

### Dernière revue des préférences et du chargement

La revue finale a identifié deux transitions de préférences à protéger : une réponse d’authentification lente pouvait écraser un choix de langue ou de thème effectué entre-temps ; une préférence présente seulement en cookie pouvait être remplacée par le défaut du navigateur. Le reviewer a corrigé ces cas avec des régressions ciblées, intégrées aux 148 tests unitaires et d’interface réussis. La passe finale des 22 parcours navigateur a également réussi. Les commandes et limites sont consignées dans le bilan.

Les mesures Lighthouse ont aussi montré que le fond de jour rendu côté serveur était remplacé par celui de nuit après l’hydratation. Cette seconde requête tardive pénalisait le plus grand élément visible. Le développeur performance a remplacé ce changement tardif par une sélection des deux images selon le thème CSS, en suivant les guides Next.js installés. Le navigateur charge seulement le fond correspondant. L’optimisation d’images de Next.js et les polices hébergées localement réduisent le transfert ; elles conservent les illustrations et familles existantes. Les polices sont accompagnées de leurs licences. Le bilan retient la mesure finale 74/100/100/92 ; le seuil de 90 en performance mobile reste non atteint. Les scores intermédiaires ne sont pas présentés comme une réussite du seuil de remise.
