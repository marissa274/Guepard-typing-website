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

Les fonctions absentes sont indiquées dans `docs/EXIGENCES.md` : notamment OAuth, photos téléversées, bonus, contraintes complètes de salle et séries MPM intra-course. Les snapshots historiques ne reconstituent pas de frappes ou de séries qui n’ont pas été enregistrées. La démarche personnelle du nom et du logo doit être fournie par l’auteur ; les agents ne peuvent pas la certifier.
