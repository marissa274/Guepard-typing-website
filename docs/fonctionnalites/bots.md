# Bots déterministes

Le moteur `src/server/bot-engine.ts` couvre BOT-01, BOT-02, BOT-03 et BOT-05. Le lobby identifie explicitement chaque bot et permet de choisir ses cinq niveaux. Les bonus de BOT-04 ne sont pas encore implémentés.

| Niveau | Cadence de base (MPM) | Probabilité d'erreur par caractère |
| --- | --- | --- |
| Noob | 18 | 12 % |
| Débutant | 32 | 8 % |
| Intermédiaire | 56 | 5 % |
| Expert | 100 | 2 % |
| Impossible | 175 | 0,5 % |

La cadence est une base avant ralentissements, pas une vitesse finale garantie. Chaque caractère reçoit une durée entre 75 % et 125 % de la durée de base. Les mots de plus de six lettres ralentissent progressivement la frappe, jusqu'à 25 %. Les caractères non ASCII ajoutent 8 %. Une hésitation de 80 à 280 ms survient avec une probabilité de 4 %.

Une erreur compte une frappe incorrecte, puis une frappe de correction. En correction obligatoire, le bot attend entre 100 et 300 ms et une fraction de la durée du caractère avant de valider celui-ci. En mode libre, il poursuit le mot et corrige ses erreurs à la prochaine espace ou à la fin du texte ; cette correction ajoute également un délai. Les erreurs diminuent donc réellement le MPM net et la précision. La progression ne recule jamais.

La graine est composée de l'identifiant du salon, de celui du bot et de l'heure de départ serveur. Les événements sont rejoués depuis cette graine : un redémarrage du serveur, une reconnexion ou une fréquence différente des mises à jour ne changent ni le parcours ni l'heure d'arrivée calculée. La prochaine manche utilise une nouvelle heure de départ, donc une nouvelle graine.

Le moteur limite les événements à l'échéance de la course. Un tick tardif ne permet jamais à un bot de continuer après cette échéance. Les arrivées sont horodatées à leur instant simulé exact, plutôt qu'à l'heure de lecture du salon.

Vérification : `npm test -- --runTestsByPath tests/bot-engine.test.tsx tests/room-engine.test.tsx` couvre les cinq niveaux, le rejeu déterministe, les variations de vitesse, la correction, les arrivées et les limites temporelles.
