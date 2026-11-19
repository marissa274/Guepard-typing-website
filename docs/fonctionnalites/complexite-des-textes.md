# Complexité des textes et options de caractères (CONF-03, CONF-05, CONF-06)

Lecteur visé : développeur ou enseignant. Sources : `src/server/text-generator.ts` (constante `complexityCriteria`, fonctions `measureComplexity`, `complexityScore`, `classifyComplexity`), `src/data/corpus.ts` (corpus seedé dans la table `guepard_corpus`). Tests : `tests/text-complexity.test.tsx`, `tests/text-generator.test.tsx`.

## CONF-05 : critères mesurables

Chaque entrée du corpus est mesurée. Les mots sont découpés sur les espaces, et seuls les lettres et les chiffres sont comptés (une apostrophe ou une virgule ne compte pas). Les fins de phrase sont `. ! ? ; :`.

| Critère | Mesure | Poids |
| --- | --- | ---: |
| Longueur des mots | nombre moyen de lettres par mot | × 1 |
| Mots rares ou savants | part des mots de 9 lettres ou plus (`longWordLetters`), utilisée comme indicateur de faible fréquence d'usage : les mots longs sont en moyenne les moins fréquents | × 10 |
| Longueur des phrases | nombre de mots par phrase (passages cohérents seulement, un dictionnaire n'a pas de phrases) | × 0,1 |

`score = lettres/mot + 10 × part des mots longs + 0,1 × mots/phrase`

| Type | Facile | Moyen | Difficile |
| --- | --- | --- | --- |
| Cohérent (`story`) | score < 7 | 7 ≤ score < 9 | score ≥ 9 |
| Aléatoire (`words`) | score < 7 | 7 ≤ score < 11 | score ≥ 11 |

Les caractères spéciaux sont le troisième critère. En mode aléatoire, plus la complexité est élevée, plus il y a de nombres, de symboles et de ponctuation (constante `randomText`) :

| Complexité | Nombre (0 à 99) collé tous les | Symbole `@ # +` collé tous les | Virgule tous les | Phrase de |
| --- | ---: | ---: | ---: | ---: |
| Facile | 15 mots | 17 mots | 9 mots | 8 mots |
| Moyen | 11 mots | 13 mots | 7 mots | 10 mots |
| Difficile | 7 mots | 9 mots | 5 mots | 12 mots |

Le test `CONF-05: every corpus entry has the complexity its measured criteria give` impose que la complexité déclarée de chaque entrée soit celle que donne `classifyComplexity`. Toute nouvelle entrée mal classée fait donc échouer la CI.

### Mesures du corpus actuel (25 entrées)

| Entrée | Langue | Type | Complexité | Mots | Lettres/mot | Mots ≥ 9 lettres | Mots/phrase | Score |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| original-fr-easy-story | FR | story | easy | 53 | 3,77 | 0 % | 8,83 | 4,66 |
| original-fr-medium-story | FR | story | medium | 52 | 5,42 | 21,15 % | 13 | 8,84 |
| original-fr-hard-story | FR | story | hard | 47 | 7,94 | 53,19 % | 11,75 | 14,43 |
| original-en-easy-story | EN | story | easy | 55 | 3,71 | 0 % | 9,17 | 4,63 |
| original-en-medium-story | EN | story | medium | 49 | 5,2 | 8,16 % | 12,25 | 7,25 |
| original-en-hard-story | EN | story | hard | 48 | 8,23 | 58,33 % | 12 | 15,26 |
| pd-fr-easy-cigale | FR | story | easy | 47 | 4,6 | 6,38 % | 15,67 | 6,8 |
| pd-fr-easy-corbeau | FR | story | easy | 38 | 4,34 | 0 % | 6,33 | 4,98 |
| pd-fr-easy-seguin | FR | story | easy | 51 | 4,22 | 1,96 % | 10,2 | 5,43 |
| pd-fr-medium-descartes | FR | story | medium | 88 | 4,3 | 7,95 % | 22 | 7,29 |
| pd-fr-medium-fogg | FR | story | medium | 54 | 4,91 | 11,11 % | 27 | 8,72 |
| pd-fr-hard-verne | FR | story | hard | 44 | 5,64 | 22,73 % | 22 | 10,11 |
| pd-en-easy-peter | EN | story | easy | 34 | 4,53 | 5,88 % | 17 | 6,82 |
| pd-en-easy-peter-garden | EN | story | easy | 41 | 3,78 | 2,44 % | 6,83 | 4,71 |
| pd-en-medium-alice | EN | story | medium | 57 | 4,14 | 5,26 % | 28,5 | 7,52 |
| pd-en-medium-bohemia | EN | story | medium | 35 | 3,94 | 5,71 % | 35 | 8,01 |
| pd-en-medium-austen | EN | story | medium | 70 | 4,29 | 10 % | 35 | 8,79 |
| pd-en-medium-darwin | EN | story | medium | 57 | 4,56 | 8,77 % | 28,5 | 8,29 |
| pd-en-hard-declaration | EN | story | hard | 71 | 4,65 | 5,63 % | 71 | 12,31 |
| original-fr-easy-words | FR | words | easy | 18 | 4,5 | 0 % | — | 4,5 |
| original-fr-medium-words | FR | words | medium | 12 | 7,42 | 16,67 % | — | 9,08 |
| original-fr-hard-words | FR | words | hard | 10 | 12,3 | 100 % | — | 22,3 |
| original-en-easy-words | EN | words | easy | 18 | 4,33 | 0 % | — | 4,33 |
| original-en-medium-words | EN | words | medium | 12 | 7,5 | 25 % | — | 10 |
| original-en-hard-words | EN | words | hard | 10 | 12 | 100 % | — | 22 |

Les entrées `pd-*` sont des extraits du domaine public. La source exacte (auteur, œuvre, chapitre, année) est stockée dans la colonne `source` de chaque entrée. Les classiques n'ont pas été rangés d'après leur réputation mais d'après leur score : par exemple, le Discours de la méthode sort en « moyen », car ses mots sont courts malgré des phrases longues. Pour que tout se tape au clavier, deux adaptations ont été faites : les apostrophes sont droites (`'`) et les tirets cadratins sont remplacés par des virgules.

## CONF-03 : enchaînement des passages (mode cohérent)

- Les passages de la langue et de la complexité choisies sont mélangés, puis enchaînés, chacun pris depuis son début, jusqu'à atteindre le nombre de mots demandé. Le dernier passage est coupé au mot près.
- Tant que tous les passages correspondants n'ont pas été utilisés, aucun n'est repris. Quand la longueur demandée dépasse le corpus disponible (actuellement de 91 mots en FR difficile à 268 mots en EN moyen, soit 2 à 5 passages par combinaison langue/complexité), une nouvelle tournée mélangée commence, sans jamais redémarrer par le passage qui vient d'être tapé. La répétition est donc possible au-delà de la taille du corpus, mais jamais deux fois de suite le même passage.
- Avec PostgreSQL, ces passages viennent de la table `guepard_corpus`. Elle est alimentée au démarrage (`src/server/text-corpus.ts`) et par `npm run db:seed`, avec `ON CONFLICT DO NOTHING`, si bien que les nouvelles entrées s'ajoutent aux bases existantes.

## CONF-06 : options selon le type de texte

| Option | Aléatoire (`words`) | Cohérent (`story`) | Personnalisé |
| --- | --- | --- | --- |
| Ponctuation | active : virgules et points ajoutés selon la complexité ; inactive : aucune | active : ponctuation du passage conservée ; inactive : retirée (`. , ; : ! ? ' " … ( ) « » — – -`) | conservée ou retirée |
| Majuscules | active : majuscule au début de chaque phrase ; inactive : tout en minuscules | active : casse du passage conservée ; inactive : tout en minuscules | idem |
| Accents (français) | actifs : mots accentués conservés ; inactifs : accents retirés | idem | idem |
| Nombres | actifs : nombre de 0 à 99 ajouté selon la complexité | actifs : les passages contenant des chiffres passent en tête (par exemple Verne, « L'année 1866 ») ; inactifs : chiffres retirés. Aucun chiffre n'est inventé dans un texte réel | conservés ou retirés |
| Caractères spéciaux | actifs : `@ # +` ajoutés selon la complexité | même règle que les nombres (le corpus actuel n'en contient pas : l'option n'a alors aucun effet visible) | conservés ou retirés |

CONF-07 (caractères inclus ou exclus) reste désactivé en mode cohérent. Voir `textes-et-bonus.md`.
