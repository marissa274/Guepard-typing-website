export const animals = [
  {id:'cheetah',fr:'Guépard',en:'Cheetah',landscape:'sun',themeFr:'Clairière dorée',themeEn:'Golden clearing'},
  {id:'parrot',fr:'Perroquet',en:'Parrot',landscape:'canopy',themeFr:'Canopée',themeEn:'Canopy'},
  {id:'crocodile',fr:'Crocodile',en:'Crocodile',landscape:'river',themeFr:'Rivière',themeEn:'River'},
] as const;
export type AnimalId = typeof animals[number]['id'];
export function isAnimal(value:unknown):value is AnimalId{return animals.some(a=>a.id===value)}
export function animalFor(value:unknown){return animals.find(a=>a.id===value)||animals[0]}
