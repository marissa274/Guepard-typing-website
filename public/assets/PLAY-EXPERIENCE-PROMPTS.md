# Animations de GUÉPARD

Générées avec le skill imagegen et l’outil intégré, le 7 octobre 2026. Alpha conservé, sans retouche raster externe.

## race-gaits.png
Référence : race-runners.png. Prompt : atlas transparent, grille stricte 4 colonnes × 6 lignes. Une espèce par ligne : guépard, gazelle, lièvre, renard, panda, tortue. Quatre poses séquentielles distinctes : regroupement, propulsion, extension, réception. Galop avec dos souple pour le guépard, bonds de gazelle, poussée des pattes arrière du lièvre, trot du renard, démarche du panda, marche alternée de la tortue sans phase aérienne. Profil vers la droite, volume arrondi, textures de feutre, contours artisanaux. Corps ancré dans chaque cellule, silhouettes complètes, aucun texte ni quadrillage, fond réellement transparent.

Sortie : 1024 × 1536, cellules 256 × 256. CSS change les poses, la progression serveur pilote séparément la position sur la piste. Les espèces emploient des durées différentes. Les animations s’arrêtent pendant l’attente, après inactivité de progression et à l’arrivée. La réduction des animations utilise une pose fixe.

## sleeping-tail.png
Référence : cheetahs-3d-marker.png, guépard endormi de gauche. Prompt : atlas transparent 2 × 2, même corps recroquevillé, tête sur les pattes, yeux fermés et queue entière avec marge. Quatre poses où seule la pointe de la queue se déplace lentement : repos, pointe levée, vers la droite, retour. Queue attachée continuellement au corps, pas de clavier, pas de texte, même rendu 3D feutre.

Sortie : 1254 × 1254. Séquence lente avec une longue pause au repos. Utilisée dans le lobby et l’accueil. Le guépard du footer reste l’asset original de l’accueil.
