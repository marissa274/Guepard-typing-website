# Textes, complexité, caractères et bonus

Lecteur visé : développeur ou enseignant. Sources : `src/data/corpus.ts`, `src/server/text-generator.ts`, `src/server/race-bonuses.ts`.

## CONF-05 - Complexité

Dans le code, la complexité est une étiquette (`easy`, `medium`, `hard`) : le générateur filtre le corpus par langue, complexité et type (`story` ou `words`) et ne calcule aucun score. Les critères ci-dessous sont des mesures du corpus original actuel (12 entrées), obtenues en découpant sur les espaces et en comptant les lettres et chiffres de chaque mot. Aucun test automatique ne les vérifie ; aucune liste de fréquence d'usage n'est utilisée.

| Entrée | Mots | Lettres/mot (moyenne) | Mot le plus long | Mots de 9 lettres ou plus | Accents | Signes de ponctuation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| FR facile, phrases | 53 | 3,77 | 8 | 0 | 1 | 7 |
| FR moyen, phrases | 52 | 5,42 | 12 | 11 | 7 | 6 |
| FR difficile, phrases | 47 | 7,94 | 15 | 25 | 15 | 8 |
| EN facile, phrases | 55 | 3,71 | 7 | 0 | 0 | 7 |
| EN moyen, phrases | 49 | 5,20 | 12 | 4 | 0 | 6 |
| EN difficile, phrases | 48 | 8,23 | 15 | 28 | 0 | 5 |
| FR facile, mots | 18 | 4,50 | 6 | 0 | 0 | 0 |
| FR moyen, mots | 12 | 7,42 | 10 | 2 | 6 | 0 |
| FR difficile, mots | 10 | 12,30 | 16 | 10 | 7 | 0 |
| EN facile, mots | 18 | 4,33 | 6 | 0 | 0 | 0 |
| EN moyen, mots | 12 | 7,50 | 9 | 3 | 0 | 0 |
| EN difficile, mots | 10 | 12,00 | 15 | 10 | 0 | 0 |

Critères mesurables retenus : longueur moyenne des mots (environ 4 en facile, 5 à 7,5 en moyen, 8 et plus en difficile), longueur du mot le plus long (8 au plus en facile, 15 ou plus en difficile), part de mots de 9 lettres ou plus (aucun en facile) et présence d'accents en français. Les chiffres et caractères spéciaux ne figurent pas dans le corpus ; ils sont ajoutés par les options en mode aléatoire (voir ci-dessous), indépendamment de la complexité. Limite : les listes de mots ne contiennent que 10 à 18 mots par entrée, tirés avec remise.

## Génération

- Aléatoire (`words`) : mots tirés avec remise dans l'entrée correspondante. Option nombres : un nombre de 0 à 99 collé à chaque 11e mot à partir du 9e. Option spéciaux : `@`, `#` ou `+` collé à chaque 13e mot à partir du 8e.
- Cohérent (`story`) : une entrée tirée au hasard parmi celles qui correspondent ; les mots sont pris dans l'ordre et recommencent au début si la longueur demandée dépasse le passage.
- Personnalisé : texte transformé par les options, d'au moins 10 caractères après transformation.
- Les options ponctuation, accents, majuscules, nombres et spéciaux transforment le texte dans tous les modes.

## CONF-07 - Caractères inclus ou exclus

- Texte aléatoire : les mots contenant un caractère exclu sont écartés, puis les caractères exclus sont retirés des mots restants. Chaque caractère inclus (espaces ignorés) apparaît au moins une fois, ajouté à la fin d'un mot si besoin. Un caractère à la fois inclus et exclu provoque une erreur (« Un caractère ne peut pas être inclus et exclu en même temps. »).
- Texte cohérent et personnalisé : l'option est désactivée. L'interface désactive les deux champs (`RoomSettings.tsx`, `disabled` hors mode `words`) et le serveur ignore `whitelist` et `blacklist` ; `tests/text-generator.test.tsx` vérifie que les mots du passage ne changent pas. Les passages ne sont donc jamais filtrés ni modifiés par ces champs.

## BONUS-01 - Règle exacte

Active seulement si `settings.bonuses` est vrai (faux par défaut) et pendant la phase `running`. La progression d'un joueur est `progress / longueur de son propre texte cible`.

1. Parmi les joueurs (`role: player`, non abandonnés, bots compris), le meneur a la progression la plus élevée ; l'égalité est tranchée par l'identifiant.
2. Les points de contrôle 25 %, 50 % et 75 % sont traités dans l'ordre, une seule fois chacun (mémorisés dans `bonusCheckpoints`), dès que la progression du meneur les atteint.
3. Reçoit un bonus tout joueur, autre que le meneur, qui n'a pas fini, a reçu moins de 3 bonus et est soit à la progression minimale (les égalités en dernier comptent), soit à plus de 25 points de progression derrière le meneur (écart strictement supérieur à 0,25).
4. Le type dépend du point de contrôle : 25 % raccourci, 50 % détour, 75 % pause. Chaque attribution est journalisée dans `bonusEvents` (point de contrôle, type, bénéficiaire, cible, heure).

Comme il n'y a que trois points de contrôle, le plafond est de 3 bonus par joueur et par course (compteur `bonusReceived`). Les effets sur le meneur (détour, pause) ne sont appliqués qu'une fois par point de contrôle, même s'il y a plusieurs bénéficiaires, et ignorés si le meneur a déjà fini.

## BONUS-02 - Les trois types implémentés

| Type | Effet dans le code | Aide le retardataire | Ralentit le meneur |
| --- | --- | --- | --- |
| `shortcut` (25 %) | retire jusqu'à trois mots non encore saisis à la fin du texte du bénéficiaire (au moins un mot reste) | oui | non |
| `detour` (50 %) | ajoute au texte du meneur les trois premiers mots du texte de la salle | non | oui (texte plus long) |
| `pause` (75 %) | le serveur refuse les saisies du meneur pendant 2 s (« Le bonus du meneur impose une courte pause. ») ; pour un bot, 2 s sont ajoutées à son temps simulé | non | oui |

Rapport à l'énoncé : « −3 mots » correspond à `shortcut`, « +3 mots » à `detour`. Le « brouillard » (mots flous) n'est pas implémenté ; `pause` le remplace. L'exigence « au moins un bonus qui aide et au moins un qui ralentit le meneur » est satisfaite par `shortcut` d'une part, `detour` et `pause` d'autre part. Justification déduite de l'architecture, à confirmer par l'autrice : `detour` et `pause` modifient des données que le serveur contrôle (longueur du texte cible, refus des saisies), alors qu'un flou serait un effet d'affichage non vérifiable côté serveur, en contradiction avec le principe du serveur autoritaire. La progression et le MPM restent cohérents après modification du texte car ils sont calculés sur le texte cible propre à chaque joueur (BONUS-04).
