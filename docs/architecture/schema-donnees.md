# Schéma des données

Le schéma courant, la séparation SQL/JSONB et les règles de confidentialité sont documentés dans [ARCHITECTURE.md](../ARCHITECTURE.md). Les définitions exécutables sont les [migrations SQL](../../migrations/) et les modules `src/server/*-schema.ts`.

PostgreSQL conserve comptes, sessions, photos, identités OAuth, états OAuth éphémères, corpus, salons JSONB, présences uniques, limites de code et résultats personnels. Le corpus est interrogé avec Drizzle ; les transactions de salons et de résultats utilisent `pg` et des contraintes SQL explicites.

Un résultat archive les séries temporelles effectivement collectées et la heatmap de son propriétaire. Les snapshots ne publient ni jetons, ni identifiants de compte, ni empreintes IP, ni heatmaps des autres participants. Les anciens résultats dépourvus de ces données ne reçoivent aucune série inventée.

Le mode JSON reste un secours local à une seule instance pour les salons. Il ne remplace pas PostgreSQL pour les comptes et leurs fonctions persistantes.
