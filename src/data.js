// Replace this adapter with API calls when a backend is available.
export const raceService = {
 async list() { return [
 {id:'canopy',name:{fr:'Sprint de la canopée',en:'Canopy sprint'},language:'FR',players:4,max:6,animal:'🦜',color:'green',state:'waiting'},
 {id:'river',name:{fr:'Au fil de la rivière',en:'Down the river'},language:'EN',players:2,max:6,animal:'🐊',color:'blue',state:'waiting'},
 {id:'sun',name:{fr:'La savane express',en:'Savanna express'},language:'FR',players:5,max:6,animal:'🦁',color:'orange',state:'running'}]; },
 text(language) { return language === 'EN' ? 'The jungle wakes up under a golden sky. A little cheetah follows the river and discovers a world full of colour.' : 'La jungle se réveille sous un ciel doré. Un petit guépard longe la rivière et découvre un monde rempli de couleurs.'; }
};

// Local-only adapter: replace with a server-generated lobby and invitation API later.
raceService.createPrivate = ({name,language}) => ({
 id:'private-'+globalThis.crypto.randomUUID(),name:{fr:name,en:name},language,
 players:1,max:6,animal:'🐆',color:'green',state:'waiting',private:true,
 code:globalThis.crypto.randomUUID().slice(0,8).toUpperCase()
});
