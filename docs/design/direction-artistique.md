# GUÉPARD - Direction artistique

**Version de travail - 7 octobre 2026.** Cette direction donne une cohérence au prototype. Elle peut changer après les tests avec les utilisateurs, les contraintes techniques et les retours du cours.

## Origine de l'idée

Les idées d'interface, le choix de la jungle, le rôle des animaux et les parcours de jeu viennent de moi. J'ai utilisé ChatGPT pour m'aider à conceptualiser ces idées, explorer des compositions et produire des propositions visuelles. L'outil a accompagné la mise en forme : il n'est pas à l'origine du concept. Le logo au guépard sur son clavier a été fourni comme référence de départ et reste l'élément d'identité principal.

J'ai choisi la jungle parce que les animaux et la végétation attirent l'attention des enfants. Ils rendent la pratique du clavier plus accueillante et donnent à chaque course une personnalité. L'objectif est de faire ressentir une aventure collective plutôt qu'un exercice scolaire, tout en gardant la frappe, les résultats et les réglages faciles à lire.

## Intention et public

GUÉPARD est une plateforme de courses de vitesse au clavier. Le ton est joyeux, curieux et rassurant. Les animaux sont chaleureux et expressifs, jamais agressifs. La scène invite à jouer immédiatement ; les contrôles restent de vrais champs, boutons et liens accessibles au clavier. L'univers s'adresse d'abord aux enfants et aux groupes scolaires, sans exclure les autres joueurs.

## Identité visuelle

| Élément | Décision actuelle | Usage |
| --- | --- | --- |
| Nom | **GUÉPARD** | Court, mémorisable, lié à la vitesse. |
| Logo | Guépard endormi sur un clavier, fourni pour le projet | Header et marque. Ne pas le redessiner arbitrairement. |
| Formes | Arrondies, contours légèrement irréguliers | Panneaux, cartes, boutons, planches. |
| Matières | Papier crème, bois clair, feutre visible | Surfaces chaleureuses ; le grain reste discret sous les textes. |
| Animaux | Volume 3D mat avec traces de coloriage au feutre | Mascottes du décor, portraits, pistes et podium. |
| Décor | Clairière centrale, végétation en plusieurs plans | Encadrer l'action sans cacher l'interface. |

## Palette de référence

| Couleur | Code | Rôle |
| --- | --- | --- |
| Beige sable | `#F7E7C6` | Papier, lumière, zones calmes. |
| Vert feuille | `#5BAE4A` | Feuilles, états positifs, touches secondaires. |
| Vert forêt | `#2F6B3D` | Header, footer, titres et contraste. |
| Orange mangue | `#F28C28` | Action principale et moments de départ. |
| Jaune soleil | `#F6C445` | Accents, chaleur et mise en valeur. |
| Bleu rivière | `#5BC0EB` | Eau, détails et respiration dans la palette. |

Le prototype emploie parfois des variantes plus claires ou plus sombres pour les surfaces et les ombres. Les six teintes ci-dessus sont la référence, pas une interdiction de nuances. En mode nuit, le ciel devient bleu nuit ; la lisibilité prime sur la fidélité exacte des couleurs de jour.

## Typographie

Le prototype utilise **Nunito** pour les titres et le nom, **DM Sans** pour l'interface et les textes, et **Kalam** pour quelques accents manuscrits. Les titres ont du caractère, mais les instructions, réglages, résultats et formulaires privilégient la lecture rapide. Les textes importants doivent rester confortables sur mobile et ne jamais être intégrés à une image.

## Règles de composition

1. Une action principale ressort à chaque étape : rejoindre ou créer une course, lancer, taper, puis voir les résultats.
2. Les animaux et grandes feuilles appartiennent au paysage ; ils peuvent dépasser d'un cadre sans recouvrir un contrôle ou un lien.
3. Les panneaux crème isolent les données détaillées du décor. Le contraste et l'espacement sont vérifiés sur ordinateur et tablette.
4. Les cartes de courses reprennent l'animal choisi pour assurer une image cohérente même quand un joueur crée son propre salon.
5. Les animations sont lentes et décalées : feuilles, lianes, respiration, clignements. `prefers-reduced-motion` supprime les mouvements décoratifs.
6. La position sur une piste exprime la progression dans le texte ; l'espèce exprime le rang. La couleur et le pseudo restent stables pour identifier le joueur.

## Points ouverts

Le design pourra changer après observation des enfants en situation de jeu. Les principales questions à vérifier sont la lisibilité des pistes pendant la frappe, la compréhension des trois actions de l'accueil, la densité du lobby pour une classe entière et la navigation sur petit écran. Les illustrations générées pour le prototype devront rester cohérentes si de nouvelles espèces ou scènes sont ajoutées.

## Références internes

- [Moodboard](moodboard.md)
- [Logo fourni](../../public/assets/guepard-logo.png)
- [Décor de jungle](../../public/assets/relief-background.png)
- [Animaux en relief](../../public/assets/relief-animals.png)
- [Prompts et provenance des illustrations](../../public/assets/RELIEF-PROMPTS.md)
