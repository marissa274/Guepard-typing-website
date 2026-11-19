# Textes, complexité, caractères et bonus

Lecteur visé : développeur ou enseignant. Sources : `src/data/corpus.ts`, `src/server/text-generator.ts`, `src/server/race-bonuses.ts`.

## CONF-05 - Complexité

Critères mesurables (longueur des mots, part des mots longs, longueur des phrases, densité de caractères spéciaux), seuils, mesures de chacune des 25 entrées du corpus et effet des options selon le type de texte : voir [complexite-des-textes.md](complexite-des-textes.md). Les constantes se trouvent dans `complexityCriteria` (`src/server/text-generator.ts`), et un test vérifie que chaque entrée a la complexité que donnent ces critères.

## Génération

- Aléatoire (`words`) : les mots sont tirés avec remise dans l'entrée correspondante. Les nombres, les symboles `@ # +`, la ponctuation et les majuscules de début de phrase sont ajoutés à une cadence qui dépend de la complexité.
- Cohérent (`story`) : les passages correspondants sont enchaînés dans un ordre mélangé, chacun depuis son début, sans en reprendre un avant d'avoir utilisé tous les autres, et jamais deux fois de suite le même.
- Personnalisé : texte transformé par les options, d'au moins 10 caractères après transformation. Avant le décompte, seul l'hôte le reçoit dans l'instantané du salon (COURSE-03).
- Le détail par option et par type figure dans [complexite-des-textes.md](complexite-des-textes.md#conf-06--options-selon-le-type-de-texte).

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
| `pause` (75 %) | pendant 2 s, le serveur ignore sans erreur les saisies du meneur, qui ne progresse pas ; la zone de frappe est désactivée et le client conserve la saisie puis la renvoie à la fin de la pause ; pour un bot, 2 s sont ajoutées à son temps simulé | non | oui |

Rapport à l'énoncé : « −3 mots » correspond à `shortcut`, « +3 mots » à `detour`. Le « brouillard » (mots flous) n'est pas implémenté ; `pause` le remplace. L'exigence « au moins un bonus qui aide et au moins un qui ralentit le meneur » est satisfaite par `shortcut` d'une part, `detour` et `pause` d'autre part. Justification déduite de l'architecture, à confirmer par l'autrice : `detour` et `pause` modifient des données que le serveur contrôle (longueur du texte cible, saisies ignorées), alors qu'un flou serait un effet d'affichage non vérifiable côté serveur, en contradiction avec le principe du serveur autoritaire. La progression et le MPM restent cohérents après modification du texte car ils sont calculés sur le texte cible propre à chaque joueur (BONUS-04).
