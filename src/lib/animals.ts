export const animals = [
  {id:'cheetah',fr:'Guépard',en:'Cheetah',landscape:'sun',themeFr:'Clairière dorée',themeEn:'Golden clearing'},
  {id:'parrot',fr:'Perroquet',en:'Parrot',landscape:'canopy',themeFr:'Canopée',themeEn:'Canopy'},
  {id:'crocodile',fr:'Crocodile',en:'Crocodile',landscape:'river',themeFr:'Rivière',themeEn:'River'},
  {id:'monkey',fr:'Singe',en:'Monkey',landscape:'monkey',themeFr:'Vallée des lianes',themeEn:'Vine valley'},
  {id:'elephant',fr:'Éléphant',en:'Elephant',landscape:'elephant',themeFr:'Jardin des mangues',themeEn:'Mango grove'},
  {id:'toucan',fr:'Toucan',en:'Toucan',landscape:'toucan',themeFr:'Cascade fleurie',themeEn:'Flower falls'},
] as const;
export const profileAnimals = animals;
export type AnimalId = typeof animals[number]['id'];
export type ProfileAnimalId = typeof profileAnimals[number]['id'];
export function isAnimal(value:unknown):value is AnimalId{return animals.some(a=>a.id===value)}
export function isProfileAnimal(value:unknown):value is ProfileAnimalId{return profileAnimals.some(a=>a.id===value)}
export function animalFor(value:unknown){return profileAnimals.find(a=>a.id===value)||animals[0]}
