# Finalisation fonctionnelle

Le visuel existant reste conservé. Les lots suivent la matrice des exigences et sont vérifiés avant les commits sans signature.

## Lots parallèles et contrats

1. **Salons et identité** : cookie invité signé, création réservée aux comptes, capacité 2–30, codes uniques de 6 caractères, présence unique en base, invitations réutilisables par leur destinataire, bannissement, transfert d’hôte et partie rapide sans création implicite. Vérifier permissions, concurrence et parcours multi-contextes.
2. **Moteur** : décompte de 3 secondes, reconnexion 30 secondes, limites de temps, progression plausible, fin de manche et abandon horodaté. Ajouter les bonus aux points de contrôle et les mesures temporelles. Vérifier avec horloge contrôlée, humains et bots.
3. **Comptes et données** : OAuth Discord/GitHub, photo validée/redimensionnée, migrations et seed versionnés. Vérifier états OAuth, refus d’accès, fichiers invalides et idempotence des scripts. L’activation réelle des fournisseurs nécessite leurs variables de configuration.
4. **Texte et interface fonctionnelle** : corpus PostgreSQL, complexité et caractères ; intégrer capacités, invitations, conflits de présence, décompte, bonus et graphiques. Vérifier création, adhésion, course, résultats et historique.
5. **Qualité et remise** : traduction, TypeScript strict sans `any`, lint CI, préférences et mobile, documentation exacte. Mesurer l’accueil et vérifier les parcours avec l’installation propre.

## Dépendances et acceptation

Les contrats des salons et des courses sont partagés dans `room-types.ts`. La génération de texte reste une fonction pure ; le service charge le corpus serveur avant le départ. Les résultats sont persistés après finalisation et ne reconstituent aucune frappe absente.

La validation finale doit réussir : installation propre, lint, typage, tests unitaires, compilation, tests navigateur et vérification des droits. Les éléments nécessitant des secrets OAuth, un compte d’hébergement ou la démarche personnelle de l’auteur sont documentés séparément ; ils ne seront pas déclarés validés sans preuve.
