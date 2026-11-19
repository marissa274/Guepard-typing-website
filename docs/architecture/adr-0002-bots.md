# ADR-0002 - Gestion des bots

**Statut :** accepté et implémenté (`src/server/bot-engine.ts`, `src/server/room-engine.ts`).

**Lecteur visé :** développeur ou enseignant qui relit l'architecture.

## Contexte

L'énoncé demande des bots de cinq niveaux (BOT-01), dont la vitesse varie (BOT-02), qui font des erreurs coûteuses en temps et respectent le mode d'erreur (BOT-03), qui sont identifiés et soumis aux bonus (BOT-04) et dont le moteur est déterministe à partir d'une graine (BOT-05). Le serveur est autoritaire (COURSE-06) et aucun client ne doit simuler les bots. Le serveur n'a pas de processus permanent par salon : l'état d'un salon n'avance que lorsqu'une requête ou une lecture SSE le lit.

## Décision

- Un bot est un participant `kind: 'bot'`, sans jeton, nommé « Bot N », ajouté par l'hôte en phase `waiting` (action `bot`, niveau `medium` par défaut, modifiable par `difficulty`). Il compte dans la capacité et dans le minimum de deux joueurs, pas comme humain.
- Son avancement est une fonction pure `botState({seed, level, text, blockErrors, elapsedMs})`. La graine est `identifiant du salon : identifiant du bot : heure de départ`, passée dans un générateur pseudo-aléatoire à graine (hachage FNV puis mélange de type mulberry). Le moteur rejoue tous les caractères depuis le début à chaque appel.
- Niveaux (cadence nominale en MPM, probabilité d'erreur par caractère) : noob 18 / 12 %, beginner 32 / 8 %, medium 56 / 5 %, expert 100 / 2 %, impossible 175 / 0,5 %. Durée d'un caractère : 12 000 / MPM ms, multipliée par un facteur aléatoire de 0,75 à 1,25, par +2,5 % par lettre au-delà de six dans le mot (plafond +25 %) et +8 % pour un caractère non ASCII ; hésitation de 80 à 280 ms avec 4 % de probabilité.
- Erreur : en correction obligatoire, le bot attend 100 à 300 ms plus 35 % de la durée du caractère puis valide ; en mode libre, les erreurs sont corrigées à la prochaine espace ou en fin de texte (délai de 55 % du temps de correction par erreur).
- Le serveur avance les bots sur une grille de 250 ms à partir de `startedAt` (`tick`). Un retard de lecture rattrape toutes les étapes manquées dans l'ordre. Les bonus et l'échantillonnage MPM sont appliqués à chaque étape.
- Les bonus agissent sur un bot comme sur un humain : texte cible raccourci ou allongé, ou pause enregistrée dans `pauses` qui décale son temps simulé et son heure d'arrivée.

## Alternatives envisagées

| Option | Raison du rejet (d'après le code et l'énoncé) |
| --- | --- |
| Simulation côté client | Contredit le serveur autoritaire (COURSE-06) et donnerait des résultats différents selon les navigateurs. |
| Minuteur serveur avec état mutable par bot | Résultat dépendant de la cadence des lectures et perdu au redémarrage ; non testable de façon reproductible (BOT-05). |
| Vitesse constante par niveau | Refusée explicitement par BOT-02. |
| Graine globale par niveau | Tous les bots d'un niveau suivraient le même parcours ; la graine contient l'identifiant du bot et l'heure de départ. |

## Conséquences

- Reproductibilité : même graine, même parcours, même heure d'arrivée, quels que soient les redémarrages, reconnexions ou fréquences de lecture. Une nouvelle manche change l'heure de départ donc la graine. Les tests `tests/bot-engine.test.tsx`, `tests/room-engine.test.tsx` et `tests/race-bonuses-integration.test.tsx` vérifient ce comportement.
- Coût : chaque évaluation rejoue le texte depuis le début, soit O(longueur du texte) par bot et par étape de 250 ms. Non mesuré avec 30 participants.
- L'échéance de course borne les événements : un bot ne progresse jamais après la limite de temps.
- La cadence MPM est nominale : les erreurs, hésitations et mots longs la réduisent, donc la vitesse réelle est inférieure.
- Les bots ne sont pas des comptes : leurs résultats ne sont pas persistés dans l'historique, qui ne concerne que les humains connectés.
