# Migration du style vers Tailwind CSS (TECH-03)

Objectif : exprimer le style en Tailwind v4 sans changer le rendu. Ce document est le plan de travail et la justification de ce qui reste en CSS.

## Constat de départ

- 11 feuilles maison (~156 Ko hors polices, 1953 règles, 593 couleurs hex) importées par `app/layout.tsx` **hors couche** : le CSS hors couche l'emporte sur `@layer utilities`, donc toute classe Tailwind ajoutée perd. Étape obligatoire : ranger tout le CSS existant dans `@layer base` / `@layer components`.
- ~72 % des déclarations sont « utilitaires » (layout, espacement, typo, couleurs, bordures, responsive, états) ; ~38 Ko sont spécifiques (`url()`, dégradés, animations, pseudo-éléments, `:has()`, `nth-`, variables pilotées par JS).
- 120 classes sont définies dans plusieurs feuilles : l'ordre d'import est un comportement à préserver.
- Pas de preflight (volontaire) : à conserver.

## Thème (`app/globals.css`)

Point d'entrée unique, dans cet ordre :
1. `@layer theme, base, components, utilities;`
2. `tailwindcss/theme.css` en `layer(theme)`
3. `../src/fonts.css` hors couche
4. `../src/styles/base.css` en `layer(base)` (reset, `:root`, variables sombres)
5. `kit.css`, `chrome.css`, `home.css`, `how.css`, `account.css`, `expeditions.css`, `lobby.css`, `race.css`, `results.css` en `layer(components)`
6. `tailwindcss/utilities.css` en `layer(utilities)`
7. `@source`, `@theme`, `@custom-variant`

```css
@theme inline {
  --color-paper: var(--paper); --color-paper-alt: var(--paper-alt); --color-card: var(--card);
  --color-leaf: var(--green); --color-ink: var(--ink); --color-muted: var(--muted);
  --color-line: var(--line); --color-line-ui: var(--line-ui);
  --color-accent: var(--orange); --color-accent-shadow: var(--shadow); --color-forest: var(--forest);
}
@theme {
  --color-*: initial;
  --color-white:#fff; --color-black:#000;
  --color-jungle:#2f6b3d; --color-cream:#f7e7c6; --color-canopy:#24432d; --color-sun:#f6c445;
  --color-parchment:#fff4d8; --color-deep-forest:#205331; --color-fresh-leaf:#5bae4a; --color-moss:#526753;
  --color-focus:#1685ad; --color-focus-night:#7fd4f2;
  --font-sans:'DM Sans',sans-serif; --font-display:'Nunito',sans-serif; --font-hand:'Kalam',cursive;
  --font-weight-ultra:1000;
  --spacing:1px;
  --radius-control:9px; --radius-panel:15px; --radius-pill:30px;
  --shadow-button:0 4px 0 var(--shadow);
  --drop-shadow-board:0 10px 0 #78512d38; --drop-shadow-plank:2px 6px 3px #46301c32;
  --text-shadow-wood:0 1px 0 #f0cb8c;
  --breakpoint-*: initial;
}
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
@custom-variant hover (&:hover);
/* du plus large au plus étroit : l'ordre de déclaration fixe la cascade */
@custom-variant from-1101 (@media (min-width:1101px)); @custom-variant from-1151 (@media (min-width:1151px));
@custom-variant from-1500 (@media (min-width:1500px)); @custom-variant from-1800 (@media (min-width:1800px));
@custom-variant upto-1600 (@media (max-width:1600px)); @custom-variant upto-1250 (@media (max-width:1250px));
@custom-variant upto-1150 (@media (max-width:1150px)); @custom-variant upto-1100 (@media (max-width:1100px));
@custom-variant upto-1050 (@media (max-width:1050px)); @custom-variant tablet (@media (max-width:1000px));
@custom-variant upto-850 (@media (max-width:850px));   @custom-variant upto-800 (@media (max-width:800px));
@custom-variant phone (@media (max-width:700px));      @custom-variant compact (@media (max-width:650px));
@custom-variant upto-620 (@media (max-width:620px));   @custom-variant upto-550 (@media (max-width:550px));
@custom-variant upto-450 (@media (max-width:450px));   @custom-variant tiny (@media (max-width:380px));
```

Pièges vérifiés en compilant Tailwind 4.3.3 :
- `max-[700px]:` produit `width < 700px` (exclut 700) : utiliser les variantes nommées ci-dessus.
- `dark:` sort après `hover:` : écrire `dark:hover:` quand les deux s'appliquent.
- `in-[.lobby-results]:` pour les règles contextuelles.
- `--spacing:1px` : convertir les utilitaires existants (gap-3→gap-12, gap-5→gap-20, mt-6→mt-24, mt-2→mt-8, p-5→p-20).
- Tailles de police en `text-[Npx]` (un token `--text-*` sans line-height pose un line-height invalide).
- `transition-transform` impose 150 ms : écrire `duration-180 ease-[ease]` pour garder l'existant.
- Jamais de classe construite dynamiquement (`'bg-'+x`).
- `motion-reduce:` remplace `@media(prefers-reduced-motion)`.

Pièges découverts pendant le lot A (chacun a produit un diff de styles calculés) :
- `@theme inline` doit venir **après** `@theme { --color-*: initial }`, sinon les jetons `paper`, `card`, `ink`, `leaf`, `muted`, `line`… sont effacés et `bg-card`, `text-ink`… ne génèrent rien.
- Pas de preflight : `border-dashed` / `border-solid` posent le style sur les **quatre** côtés (largeur `medium` = 3 px). Un bord d'un seul côté s'écrit `border-b border-b-<couleur>` ou `[border-bottom:3px_dashed_#hex]`. `border-0` pose `border-style: solid`, alors que `border:0` donne `none` : écrire `[border:0]`, ou ne rien écrire quand l'élément n'a pas de bord.
- Une couleur de bord `border-<couleur>` change aussi les côtés à largeur 0 (`currentcolor` dans l'original) : préférer `border-t-…`, `border-b-…` côté par côté.
- `list-none` ne remet pas `list-style-position` à `outside` (`summary` l'a à `inside`) : écrire `[list-style:none]`.
- `transition-[transform]` + `duration-180` laisse `transition-delay` et `transition-behavior` de la règle de base (`a,button{transition:…}` en liste de deux) : sur `a`/`button`, écrire `[transition:transform_.18s]` ; pour deux propriétés, toujours le raccourci (`duration` seul donne une liste de longueur 1).
- `transform` : écrire `[transform:rotate(-6deg)]` et non `rotate-*` (la propriété `rotate` change le style calculé), `[box-shadow:…]` et non `shadow-[…]` (les variables `--tw-ring-*` s'ajoutent à la valeur).
- Une seule utilité par propriété et par élément : Tailwind ordonne les utilitaires lui-même, pas la chaîne de classes (`aspect-square` + `aspect-[2/3]` : celle qui gagne est arbitraire). Les cas exclusifs se construisent avec une constante par variante, jamais par concaténation.
- `@variant dark { règle }` au niveau racine donne `:scope:where([data-theme=dark], …) règle` : même spécificité que `[data-theme=dark] règle` (et valide avec un pseudo-élément). Imbriqué dans une règle (`règle { @variant dark { … } }`), le sélecteur devient `règle:where(…)` : spécificité plus basse d'une classe et **invalide** quand `règle` se termine par `::before`/`::after`. `@variant <largeur>` imbriqué est sans risque.
- `@tailwindcss/postcss` passe désormais tout le CSS maison dans lightningcss (`optimize`), ce que les anciennes feuilles ne subissaient pas : `background:none` devient `0 0`, `linear-gradient(0deg,…)` est réécrit à l'envers et `background: … ` sans position reçoit `0 0` (styles calculés `0px 0px` au lieu de `0% 0%`). `postcss.config.json` passe `optimize:false` (Next minifie ensuite le CSS lui-même, comme avant).
- Ce que le CSS d'origine laissait gagner par ordre de feuilles est un comportement : `.course-code-entry` (woodland) écrasait `.home-code-entry` (jungle) pour la marge et le padding ; `.sleeping-cheetah` (lobby-compact) écrasait le fond et le ratio de jungle. Une déclaration morte ne se migre pas, elle se supprime.
- `h1`, `p`… sans couche écrasaient `sr-only` (marge `-1px`) : `sr-only m-0`.
- Les références de styles calculés contiennent l'URL des images avec le port (`localhost:5180`) : toujours `GUEPARD_TEST_PORT=5180`.

Pièges découverts pendant le lot B :
- Une classe construite par concaténation (`prefixe+'cursor-not-allowed'`) n'est pas générée : chaque classe s'écrit en entier. Un état de page (attente, course, résultats) se traduit par une chaîne de classes par mode, pas par des variantes `in-[…]`.
- Les règles `:has()`, `:empty`, `:last-child`, `[open]` gardent leur sens : `has-[…]:`, `empty:`, `last:`, `group-open:`. Un utilitaire l'emporte sur toute règle de la couche `components`, donc une propriété pilotée par une règle `:has()` laissée en CSS (affichage de la barre de lancement des résultats) reste entièrement en CSS.
- Une règle de descendant qui atteint aussi des éléments du lot C (`.lobby-page input`, `.woodland-scenery`) reste en CSS : les utilitaires ne couvrent que les éléments du lot.
- Les classes sont posées par `AnimalPicker`/`AnimalAvatar` : ils acceptent désormais `className`.
- Outil de travail : `getComputedStyle` + cascade par élément (règle gagnante, bande de largeur, thème) a servi à écrire les classes ; le diff de styles calculés reste l'arbitre (`GUEPARD_DIFF_LINES=4000` affiche tout). Les tests de salon enchaînés peuvent buter sur les limites de débit : relancer par lots.
- Les cas visuels du salon couvrent aussi la vue de l'hôte (bot, observateur, invitations, menu ouvert), le formulaire d'entrée, le salon fermé, les résultats (invité et hôte, détails ouverts) et le formulaire de création.

Pièges découverts pendant la fin de TECH-03 (nettoyage des feuilles partagées) :
- Méthode : un script jetable charge chaque cas visuel avec la CSS compilée non minifiée, retire une déclaration à la fois dans le CSSOM de la page (`rule.style.cssText`) et compare les styles calculés (sous-arbre) et les rectangles de tout le document. Une déclaration qui ne change rien dans aucun cas est candidate à la suppression. Elle ne vaut que comme présélection : le diff de styles calculés sur tout le jeu de cas reste l'arbitre.
- Les transitions masquent le résultat : sans `*{transition:none!important}` injecté, `getComputedStyle` renvoie la valeur de départ de la transition qui vient de démarrer (`a,button{transition:transform .18s,background .18s}`), donc le retrait de `background` ou de `transform` « ne change rien ».
- Retirer un longhand (`background-color`) d'une règle écrite en raccourci (`background`) ne fait rien dans le CSSOM : retirer l'élément de `cssText`.
- Deux déclarations de deux règles peuvent être chacune redondante sans l'être ensemble (`.animal-options{display:grid}` dans deux règles, `min-height:0` du radio dans deux règles, `content` d'un `::after` repris par une règle de contexte) : toute suppression automatique se vérifie par le diff complet ; les règles de pseudo-éléments, celles en `:has()` et la chaîne `.lobby-page` / `.lobby-results` / `.woodland-*` (mal couvertes aux largeurs intermédiaires et à 2688 px) sont conservées telles quelles.
- Une liste de sélecteurs n'est morte que si **chaque** partie vise une classe disparue (`.leaves-cutout,.vines-cutout` garde `.leaves-cutout`) ; les éléments nus (`h2`, `.section-heading h2,h2`) ne sont jamais morts. Les classes recherchées par mot dans les sources trompent (`how`, `status`, `steps` sont des mots des textes) : lire le contexte.
- Un nom de `@keyframes` peut être écrit avec des `_` dans une valeur arbitraire (`[animation:wooden-sign-sway_6s_…]`) : le chercher sans frontière de mot.
- Reformater du CSS avec postcss en ne gardant que les déclarations perd les `@variant` imbriqués dans une règle (`.board-ropes::before{… @variant phone{width:7px}}`).
- Une règle qui suit, dans la même couche, une règle de même sélecteur et de même contexte la masque entièrement : ces déclarations se retirent sans sonde (`scripts` jetables `shadow`) ; `@variant dark` n'est pas du même contexte qu'une règle nue (une classe de spécificité de plus).
- Les tests visuels : l'animation finie `results-settle` du podium (`scale(.96)` → `none`) était captée ou non selon la durée du chargement, d'où des références instables ; la page attend maintenant la fin des animations CSS finies. Depuis l'état 404 réel, les scripts de la page d'erreur précèdent le markup : le cas `missing` les replace en fin de `body` pour conserver les chemins DOM des références. Le survol d'une planche déplace le ciel avec une transition de 450 ms pilotée par le pointeur : la référence `home-plank-hover-dark-360` capte une valeur intermédiaire différente des trois autres (elle échoue tel quel, voir « État »).

## Stratégie

La cascade se joue par élément : on migre par paire « élément × propriété ». Pour un élément, on rassemble toutes les règles qui le ciblent (media, sombre, hover, contexte) et on les traduit ensemble en classes, puis on supprime ces déclarations.

**Utilitaires dans le JSX** : display/flex/grid, gap, padding/margin, tailles, position/inset/z, typo, couleurs via tokens, bordures/rayons, ombres simples, transitions, et leur responsive/sombre.

**Reste en CSS** (`@layer components` / `@utility`, écrit avec `var(--color-*)`, `--spacing(n)`, `@variant dark {}` et `@variant phone {}`) — conforme aux recommandations Tailwind :
- toutes les `@keyframes` (noms inchangés : les tests les vérifient) ;
- sprites et `background-position` pilotés par variables (`--gait-row`, `--pointer-x/y`, `--canopy-reach`, `--card-index`, `--racer-colour`) ;
- images `url()`, dégradés répétés (cordes, piste), pseudo-éléments décoratifs ;
- sélecteurs `#app:has(...)`, `nth-child`, combinateurs frères ;
- déclarations `!important` (leur sens s'inverse dans une couche) ;
- le kit partagé entre plusieurs groupes de composants (`button`, `primary`, `inner`, `eyebrow`, `scoreboard`, `animal`, `selected`, `wood-primary`, `wood-small-button`, `woodland-back`, `woodland-page`, `woodland-scenery`, `woodland-shell`, `lobby-page`, `lobby-active`, `lobby-results`, `animal-cutout`, `leaves-cutout`).

**Supprimé** : les classes mortes, seulement si le grep statique et la couverture CSS Chrome concordent. Attention aux classes générées (`scene-${name}`, `'avatar-'+id`, `'runner-'+species`, `'place-'+rank`) qui sont vivantes.

## Lots

- **Lot 0 (seul, en premier)** : `app/globals.css` (point d'entrée), `app/layout.tsx` (supprimer les 11 imports CSS), redécoupage mécanique des feuilles dans `src/styles/` (`base`, `kit`, `chrome` + fichiers vides des autres lots) avec ordre relatif conservé, suppression des anciennes feuilles, migration de `Chrome.tsx`, `Site.tsx`, `AnimalAvatar.tsx`, `lobby/Runner.tsx`, conversion des 5 utilitaires existants (`Auth`, `RaceGame`, `Pages`, `StatsPage`), outillage (`scripts/tailwind-metrics.ts`, `playwright.visual.config.ts`, `tests/visual/`). Sortie : diff pixel et diff de styles calculés nuls **avant** toute migration.
- **Lot A — pages publiques et compte** : `Jungle`, `SignBoard`, `JoinByCode`, `HowToPlay`, `Pages`, `Auth`, `AccountSettings`, `StatsPage`, `Races` ; `src/styles/home.css`, `how.css`, `account.css`, `expeditions.css`.
- **Lot B — salon** : `lobby/Lobby`, `CreateRoom`, `QuickJoin`, `RoomSettings`, `MembershipConflict` ; `src/styles/lobby.css`.
- **Lot C — course et résultats** : `lobby/VisualRace`, `RaceTimeline`, `RaceResults`, `PodiumDemo`, `HistoricalResults`, `RaceGame` ; `src/styles/race.css`, `results.css`.

Aucun fichier commun entre A, B et C. `globals.css`, `kit.css` et `chrome.css` appartiennent au lot 0 ; un token manquant devient une valeur arbitraire pendant les lots A-C.

## Non-régression

Contre un build de production (`GUEPARD_TEST_PORT=5180`, `next start`). Références générées sur le commit d'avant le lot 0 (via `git worktree`), sur la même machine.
- Captures : clair/sombre ; 360 et 1440 px partout, plus 380, 650, 700, 701, 1000, 1100, 1101, 1150, 1151, 1550 et 2688×1680 pour accueil, salon, résultats. Pages sans BD : `/`, `/how`, `/races`, `/create`, `/play`, `/login`, `/signup`, `/stats`, `/about`, `/contact`, `/legal`, `/privacy`, `/demo/podium` (fermé et détails ouverts), 404 ; salon et course en invité (helpers de `tests/e2e/helpers.ts`). États : menu compte ouvert, focus-visible, survol d'une planche, réglages ouverts, erreur Auth.
- Stabilisation : `document.fonts.ready`, `html[data-decor=ready]`, `animations:'disabled'`, `maxDiffPixelRatio:0.001`, masques sur code de salon, nom généré, chrono, positions de course.
- `tests/visual/computed-styles.spec.ts` : animations figées à t=0, `getComputedStyle` de chaque élément et pseudo-élément sérialisé ; diff JSON nul exigé.
- Classes et attributs à conserver comme crochets (tests et code) : voir `tests/e2e/*.spec.ts` et `tests/*.test.tsx` (`race-lane`, `results-*`, `runner-*`, `heat-*`, `podium-*`, `scene-*`, `auth-*`, `room-target`, `race-lanes`, `race-typing`, `scene-background`…) ; `data-rank`, `data-player-id`, `data-motion`, `data-sleeping`, `data-theme`, `data-decor`.

## Critère pour déclarer TECH-03 « complet »

Mesuré par `scripts/tailwind-metrics.ts` :
1. Un seul point d'entrée CSS ; aucun import CSS dans `layout.tsx` ; tout le CSS maison dans `@layer base`, `components`, `@utility` ou `@keyframes`.
2. ≥ 70 % des déclarations d'origine (hors `@font-face` et `@keyframes`) exprimées en utilitaires dans le JSX.
3. CSS restant ≤ ~50 Ko, limité aux catégories « spécifique » et « kit », justifié bloc par bloc.
4. Aucun `[data-theme=dark]` ni `@media (max|min-width…)` brut hors de `globals.css`.
5. Aucun hex littéral hors `@theme`, sauf dégradés, SVG et décor.
6. Aucune règle restante ne portant que du layout/espacement/typo sur un élément rendu par un seul composant.
7. Diffs pixel et styles calculés nuls ; `npm test`, `npm run test:e2e`, `typecheck`, `lint`, `build` passent.

### État (fin de la migration)

| Critère | Au départ de la dernière étape | Final |
| --- | --- | --- |
| 1. Point d'entrée | oui | oui |
| 2. Déclarations d'origine hors CSS | 69,3 % (1587 restantes) | **85,8 %** (4434 / 5169 ; 735 restantes) ; 1521 utilitaires générés |
| 3. CSS restant | 52,7 Ko (`kit.css` 34 Ko) | **32,0 Ko** (`kit.css` 12,7 Ko, `lobby.css` 5,9, `results.css` 4,1, `chrome.css` 2,4, `account.css` 2,3, `base.css` 1,7, `expeditions.css` 0,9, `home.css` 0,7, `race.css` 0,7, `how.css` 0,5) |
| 4. `[data-theme=dark]` / `@media` de largeur bruts | 25 / 34 | **0 / 0** (`@variant dark`, `phone`, `compact`…) |
| 5. Hex hors `@theme` (tous / hors dégradés et `url()`) | 344 / 209 | **119 / 17** |
| 6. Règles layout / typo seules | 213 | **40** |
| 7. Styles calculés et pixels | — | 384 cas sur 385 identiques ; `npm test`, `typecheck`, `lint`, `build`, `test:e2e` verts |

Périmètre du critère 5 : la mesure « hex restants » ne compte que les feuilles CSS (`app/globals.css` hors `@theme`, `src/styles/`). Elle ne voit pas les classes à valeur arbitraire écrites dans le TSX (`bg-[#…]`, `text-[#…]`…), où les couleurs ont surtout été déplacées plutôt que supprimées. Après le remplacement des hex qui avaient exactement un jeton `@theme` de même valeur (15 classes, dont `bg-[#f28c28]` devenu `bg-wood-orange`), il reste **171 classes à hex arbitraire** dans `src/` et `app/` (`grep -rhoE '[A-Za-z0-9:_-]+-\[#[0-9a-fA-F]{3,8}\](/[0-9]+)?' src app --include='*.tsx' --include='*.ts'`). Ce sont des valeurs sans jeton équivalent ; les transformer en jetons reste à faire si l'on veut une palette unique.

Ce qui a été fait : environ 780 déclarations mortes ou redondantes retirées des feuilles (`kit.css` perd 22 Ko), les règles d'un seul composant déplacées dans leur JSX (dialogue du compte, blocs « salons publics » vides ou en chargement, avatars de « Comment jouer », marqueurs de `details`, mise en page du sélecteur d'animal, rangée `course-code-entry`, bandeaux des expéditions), les variables du thème (`:root`, sombre) et une cinquantaine de couleurs du kit (boutons de bois, pages de la forêt et du salon, champs, sélecteur d'animal, anneaux de focus) devenues des jetons `@theme` ; tout le CSS restant utilise `@variant dark` et les `@variant` de largeur, et les feuilles sont reformatées une règle par ligne.

Ce qui reste, et pourquoi (le critère 7 est tenu hors un cas) :
- **Critère 5 (17 hex)** : tous sont des biseaux et ombres de pseudo-éléments (`::before` / `::after` des cordes de l'accueil, du cadre du salon, des planches et plaques, du perroquet) ou l'ombre portée du coureur : du décor au sens du plan. Le script ne les distingue pas, car il n'exempte que `gradient`, `url()` et `data:` ; les passer en jetons de thème (17 couleurs à usage unique) ne sert à rien.
- **Critère 6 (40 règles)** : 9 sont les réglages de base des éléments nus (`*`, `h1`, `h2`, `label`… dans `base.css`), 4 sont le pied de page et la navigation que les compositions `#app:has(…)` écrasent (un utilitaire annulerait ces écrasements), 20 appartiennent à la chaîne de conteneurs partagés `.woodland-*` / `.lobby-*` (au moins deux composants, listés comme noyau du kit dans le plan), 7 sont `.inner`, `.eyebrow` et `.scoreboard` (quatre pages ; leurs `h1` descendants entrent en conflit avec les `sr-only` et classes propres). Aucune ne vise un élément d'un seul composant dont le style serait indépendant du contexte ; `--strict` reste donc rouge sur les critères 5 et 6, et il n'a pas été assoupli.
- **Critère 7** : `computed styles home-plank-hover-dark-360` échoue. Sa référence (générée avant la migration) contient `matrix(1.04, 0, 0, 1.04, 0, 0.803747)` pour l'image du ciel, valeur de fin de transition, alors que les trois autres cas du survol (clair 360 et 1440, sombre 1440) contiennent la valeur de départ ; l'échec est identique avant et après les changements de style (il existait sur l'arbre fusionné de départ). Il faut régénérer cette seule référence (non versionnée) ou fixer la position de la souris dans le cas ; ce n'est pas fait ici.
