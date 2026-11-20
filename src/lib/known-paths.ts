/** Routes rendered by the catch-all page; anything else must answer HTTP 404. */
const exactPaths=['/','/play','/races','/create','/private','/demo/podium','/how','/stats','/about','/contact','/legal','/privacy'];
const prefixPaths=['/lobby/','/history/','/race/'];

export function isKnownPath(segments:string[]|undefined){
 const path='/'+(segments||[]).join('/');
 return exactPaths.includes(path)||prefixPaths.some(prefix=>path.startsWith(prefix)&&path.length>prefix.length);
}
