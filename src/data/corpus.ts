export type TextComplexity='easy'|'medium'|'hard';
export interface CorpusPassage {id:string;language:'FR'|'EN';complexity:TextComplexity;kind:'story'|'words';content:string;source:string}

const stories={
 FR:{
  easy:'Le chat suit un petit rat dans le bois. Le vent se lève et la pluie arrive. Les amis vont dans la maison. Ils ouvrent un livre et lisent une belle histoire. Au matin, le soleil revient et le jardin brille. Un oiseau se pose sur le mur puis repart vers le lac.',
  medium:'Au bord de la rivière, les explorateurs préparent leur prochaine aventure. Une carte indique un sentier entre les arbres et une clairière lumineuse. Chaque membre du groupe vérifie son équipement avant de traverser le pont. Ensemble, ils découvrent les traces discrètes des animaux et partagent leurs observations dans un carnet de voyage.',
  hard:'L’observatrice examine patiemment les transformations imperceptibles de l’écosystème. La biodiversité dépend d’interactions complexes entre les organismes microscopiques, les végétaux et les prédateurs. Une modification apparemment insignifiante peut bouleverser cet équilibre. Les chercheurs confrontent leurs hypothèses à des observations reproductibles et documentent rigoureusement chaque particularité du phénomène étudié.',
 },
 EN:{
  easy:'The cat follows a small bird into the woods. A cool wind moves the leaves. Our friends walk back to the house and open a book. They read a short tale while the rain falls. At dawn, the sun lights up the garden. A little fox runs past the gate and rests by the lake.',
  medium:'Beside the river, the explorers prepare their next adventure. A map reveals a narrow trail between the trees and a bright clearing. Each member checks the equipment before crossing the wooden bridge. Together, they discover the quiet tracks of animals and record their observations in a shared travel journal.',
  hard:'The researcher investigates the intricate relationships within a remarkable ecosystem. Biodiversity emerges from interactions between microscopic organisms, vegetation and specialised predators. An apparently insignificant disturbance can transform the surrounding environment. Investigators compare their hypotheses against reproducible observations and systematically document the unexpected characteristics of each phenomenon under examination.',
 },
};
const dictionaries={
 FR:{easy:'chat rat bois vent pluie ami livre matin soleil jardin lac pont arbre route fleur sable plage lune',medium:'rivière aventure montagne clairière lumière voyage boussole cascade découverte sentier mystère forêt',hard:'biodiversité observation transformation extraordinaire microscopique indépendance métamorphose écosystème hypothèse reproductibilité'},
 EN:{easy:'cat bird wood wind rain book dawn sun garden lake bridge tree road flower sand beach moon cloud',medium:'river adventure mountain clearing sunshine journey compass waterfall discovery pathway mystery forest',hard:'biodiversity observation transformation extraordinary microscopic independence metamorphosis ecosystem hypothesis reproducibility'},
};
export const initialCorpus:CorpusPassage[]=(['FR','EN'] as const).flatMap(language=>(['easy','medium','hard'] as const).flatMap(complexity=>(['story','words'] as const).map(kind=>({id:`original-${language.toLowerCase()}-${complexity}-${kind}`,language,complexity,kind,content:kind==='story'?stories[language][complexity]:dictionaries[language][complexity],source:'Guépard — corpus original rédigé pour la pratique du clavier, 2026'}))));
