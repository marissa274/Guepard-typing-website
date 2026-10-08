# Résultats — référence du 7 octobre 2026

Créés avec le skill imagegen, outil intégré, à partir de `Image ChatGPT 7 oct. 2026, 17_43_25.png`.

- `results-clearing.png` : recréer uniquement la clairière lumineuse de la référence, cascade distante, végétation sur les côtés, deux bannières orange à empreinte. Retirer tous les textes, animaux et éléments d’interface ; centre dégagé pour les vrais composants. Style artisanal feutre 3D, 1536 × 1024.
- `results-winners.png` : atlas transparent 3 × 2, guépard assis avec médaille d’or et lauriers, gazelle assise avec médaille argentée, lièvre avec médaille bronze, puis renard, panda et tortue. Yeux fermés et expressions de victoire, proportions et textures identiques à la référence, silhouettes séparées, sans texte ni podium. 1536 × 1024.
- `results-wood.png` : texture de bois brun miel rustique, grain vertical irrégulier, nœuds et usure discrète, relief mat dessiné au feutre, sans objets ni texte, 1024 × 1024.

Les chiffres, boutons, tableaux et heatmap sont des composants React. Aucun résultat fictif de la référence n’est injecté dans les salons.

## Variantes feutre 3D actives

Créées avec imagegen intégré, par transformation des assets précédents :
- `results-clearing-marker.png` : même composition de clairière et bannières, formes arrondies sculptées, feuilles simplifiées, traits de feutre superposés, hachures visibles, grain de papier, contours irréguliers, palette GUÉPARD, ombres mates douces. Aucun élément d’interface.
- `results-wood-marker.png` : grain de bois simplifié en relief, larges traits de feutre, contours bruns irréguliers, petits nœuds dessinés, teintes caramel et miel, sans microdétails photographiques.

Ces variantes remplacent les fonds précédents dans `results-reference.css`. Les sources originales sont conservées.

## Celebration layout, new user reference
- `results-celebration-jungle.png`: generated from the new Bravo à tous reference; text-free clearing, cheering elephant/monkey/tortoise/parrot around open space reserved for dynamic winners.
- `results-podium-stump.png`: transparent handmade 3D felt oak stump; reused at three heights; ranks and names are HTML, not baked into the image.
- `results-celebration-sign.png`: transparent light oak three-plank sign with vines, no baked text or button.
The actual standings and keyboard heatmap are disclosed by the live orange statistics button. Host permissions for rematch/closing remain enforced by the existing server.

## Grounded podium correction
`results-celebration-jungle-v2.png` is a non-destructive imagegen edit of the celebration background: cheering animals reduced to secondary scale, feet aligned near the sand, center reserved for the dynamic winners. Podium and post share the same responsive CSS ground plane. Zero-progress non-abandoned players stay in the podium selection; departed finishers remain in the authoritative result roster. Detailed view uses `?view=results` with a return link to the podium.

## Four-player visual demonstration (isolated)
`/demo/podium` uses four explicitly fictitious participants and never writes to real rooms. `results-podium-block.png` adapts the existing oak texture into a wide flat-front podium; `results-cheering-monkey.png` isolates the clapping monkey; `results-celebration-jungle-v3.png` removes its duplicate from the background. Dynamic HTML renders names, ranks, the clickable wood sign and the full-width detail view.

## Moving botanical foreground
`results-flowers.png` was derived from the orange/yellow flowers and leaves of `header-branch.png`. The results stage reuses the exact `relief-foliage.png` leaf/vine atlas and the home's `leaf-sway`/`vine-sway` animations. Separate flower clusters sway at different rates; reduced-motion keeps all botanical layers still. Each decorative layer is pointer-events:none.
