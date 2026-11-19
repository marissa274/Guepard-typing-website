# Utilisation des agents IA

## Agents, outils et fichiers d'instructions

Lecteur visé : enseignant. Le travail a été mené avec Claude Code : un orchestrateur a lu le cahier des charges et les guides Next.js locaux (`node_modules/next/dist/docs/`), réparti les tâches entre sous-agents (compte, moteur de course, statistiques, puis interface, parcours navigateur, revue de sécurité, documentation et performance), intégré, relu et lancé les tests. Les sous-agents ont partagé le même dépôt ; les rôles ont été créés pour la tâche. Les instructions du dépôt sont dans `AGENTS.md`, importé par `CLAUDE.md`, tous deux versionnés ; le bloc Next.js d'`AGENTS.md` est géré par l'outil.

Validation : Jest et React Testing Library, TypeScript strict, compilation Next.js, Playwright avec PostgreSQL local. Les résultats locaux ne prouvent ni un déploiement public ni l'exécution de la CI distante. Aucun secret n'a été ajouté aux commits.

<!-- À RELIRE PAR L'AUTRICE : les trois erreurs ci-dessous n'ont pas été modifiées (fond inchangé) ; vérifier qu'elles correspondent à ce que vous avez réellement constaté et pouvez expliquer. -->
## Trois erreurs détectées et corrigées

1. **Compter uniquement les ajouts en fin de saisie.** Le premier calcul utilisait l’augmentation de longueur du texte. Remplacer la lettre incorrecte de `axc` par `b` produisait `abc` sans ajouter de frappe : l’erreur semblait disparaître et la précision pouvait atteindre 100 %. La revue a révélé ce cas. Un helper commun identifie maintenant la plage insérée, y compris lors d’un remplacement ; le client et le plancher serveur utilisent la même règle. Des tests vérifient les compteurs et la heatmap.

2. **Laisser une restauration réseau ancienne écraser une connexion récente.** La première version du contexte vérifiait seulement si le composant était monté. Un GET initial retardé pouvait revenir après une connexion réussie et rétablir l’état invité. Un test avec réponse différée a reproduit le défaut. Une génération de session permet maintenant d’ignorer les réponses devenues obsolètes, y compris les résultats d’un ancien compte.

3. **Supposer que le champ de frappe était déjà actif au premier focus.** La suite navigateur a détecté un champ disponible mais sans focus. Le scénario isolé était intermittent ; un test de composant a reproduit le passage de connexion indisponible à disponible. L’effet de focus réagit maintenant à cette transition et ne tente pas de focaliser un champ désactivé. Le test de régression conserve ce cas.

## Réflexion et limites

La délégation a permis de travailler sur plusieurs fonctionnalités indépendantes, mais une suite verte sur un lot ne prouvait pas que l'intégration était correcte : la revue croisée a été nécessaire. Les tests ont porté sur les transitions, les données persistées et les refus d'accès autant que sur le parcours visible. La revue finale a aussi corrigé un rejeu d'invitation depuis une autre IP, l'acceptation d'un rôle invalide, des corps HTTP lus sans plafond, un doublon de présence au passage invité vers compte, une file de frappe qui répétait une requête refusée et un calcul qui comptait comme erreur une lettre correcte effacée puis retapée. Une réponse d'authentification lente pouvait aussi écraser un choix de langue ou de thème ; des régressions ciblées couvrent ces cas.

Limites : les flux OAuth sont testés avec des fournisseurs simulés ; les vraies applications restent à créer. Les snapshots historiques ne reconstituent pas de séries qui n'ont pas été enregistrées. La démarche personnelle du nom et du logo doit venir de l'autrice. Le bilan chiffré (tests, parcours navigateur, limites) figure dans [verification-fonctionnelle.md](verification-fonctionnelle.md).

## Performance (Lighthouse)

Mesure locale actuelle de l'accueil (Lighthouse 13.6.0, simulation mobile, médiane de 3, compilation de production) : performance 91 en thème sombre et 93 en thème clair, accessibilité 100, bonnes pratiques 100, SEO 100. Le seuil de 90 de PERF-01 est atteint en local ; ces mesures ne garantissent pas le déploiement public. Le gain venait surtout de la sélection du fond de jour par CSS selon le thème (au lieu d'un changement après hydratation), des images optimisées par Next.js et des polices locales. Détail : [verification-fonctionnelle.md](verification-fonctionnelle.md).
