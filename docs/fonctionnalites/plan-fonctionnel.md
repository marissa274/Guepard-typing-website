# Suite fonctionnelle de Guépard

Priorité donnée aux fonctionnalités et aux vérifications. Le visuel existant est conservé.
Le cahier des charges `Web-V-Travail-de-session.pdf` sert de référence ; les écarts ne sont pas déclarés terminés.

## Lots et critères d'acceptation

1. Compte : modifier pseudo/avatar sur le serveur ; changer le mot de passe après vérification du mot de passe actuel ; révoquer les autres sessions. Vérification : tests de validation, concurrence et interface, parcours PostgreSQL dans Playwright.
2. Course : refuser une arrivée après la limite ; borner les compteurs de frappe ; conserver les heures d'arrivée des bots ; simuler cinq niveaux avec variations déterministes. Vérification : horloge contrôlée, compteurs invalides et simulation reproductible.
3. Historique : enregistrer automatiquement les résultats des humains connectés, sans doublon ; isoler les comptes ; afficher les moyennes, victoires et historique paginé ; réouvrir une course terminée. Vérification : tests de stockage et parcours avec base réelle.
4. Mesures : afficher MPM net/brut, précision, erreurs et durée depuis la même référence de calcul ; afficher MPM et précision pendant la saisie. Vérification : tests des calculs et des composants.
5. Intégration : tests unitaires, typage, compilation et parcours navigateur ; revue des droits et des données sensibles ; commits distincts sans signature.

## Dépendances

Les lots 1 et 2 sont indépendants. Le lot 3 utilise l'identité du compte au moment de rejoindre le salon et les résultats du moteur. Le lot 4 enrichit la référence de calcul partagée. La vérification finale attend l'intégration de tous les lots.

## Travaux qui restent hors de cette tranche

OAuth Discord/GitHub, photo téléversée, règles complètes de capacité et de présence unique en salon, reconnexion par invitation, transfert d'hôte, décompte synchronisé, corpus PostgreSQL et complexité, bonus de remontée, séries temporelles des courses, traduction intégrale, TypeScript strict sans `any`, migrations/seed complets, lint CI et validation du déploiement HTTPS.

Cette liste doit être précisée dans la matrice des exigences ; elle ne constitue pas une déclaration de conformité finale.


## Bilan vérifié

Les cinq lots de cette tranche sont intégrés. Validation finale : 81 tests unitaires dans 12 suites, 17 parcours Playwright avec PostgreSQL, vérification TypeScript et compilation de production réussis. Les corrections complémentaires couvrent les remplacements de caractères, les victoires invitées, les réponses de connexion obsolètes et le focus après disponibilité de la connexion.

La [matrice des 90 exigences](../EXIGENCES.md) conserve les écarts et le [compte rendu IA](../IA.md) explique la répartition et les défauts détectés par la revue. Les Markdown d’architecture décrivent le nouvel historique ; les PDF historiques du checkpoint n’ont pas été régénérés dans cette tranche fonctionnelle.
