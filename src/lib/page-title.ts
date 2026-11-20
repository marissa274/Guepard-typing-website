import {copy} from '../i18n';
import {roomLabel} from './room-copy';
const infoPages=['/about','/contact','/legal','/privacy'];
/** Document title for each view, in the active language (WCAG 2.4.2). Shared by the server (generateMetadata) and the client. */
export function pageTitle(path:string,c:typeof copy.fr){
 if(path==='/')return c.metaTitle;
 const page=path==='/demo/podium'?c.titlePodium:path==='/play'?c.titleQuick:path==='/login'?c.login:path==='/signup'?c.titleSignup:path==='/races'?c.browse:path==='/create'||path==='/private'?c.titleCreate:path.startsWith('/lobby/')?c.titleLobby:path.startsWith('/history/')?c.titleHistory:path.startsWith('/race/')?c.lobby:path==='/how'?c.howToPlay:path==='/stats'?c.stats:infoPages.includes(path)?c[path.slice(1) as 'about'|'contact'|'legal'|'privacy']:c.missing;
 return roomLabel(c.pageTitle,{page});
}
