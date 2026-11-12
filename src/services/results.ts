import type {ResultPage} from '../lib/result-types';
import type {RoomView} from '../lib/room-types';
async function request(path:string,signal?:AbortSignal){
 const response=await fetch('/api/results'+path,{credentials:'same-origin',cache:'no-store',signal});
 const result=await response.json();
 if(!response.ok)throw new Error(result.error||'Historique indisponible.');
 return result;
}
export const resultService={
 list:(page=1,signal?:AbortSignal):Promise<ResultPage>=>request(`?page=${page}`,signal),
 detail:(id:string,signal?:AbortSignal):Promise<{room:RoomView}>=>request('/'+encodeURIComponent(id),signal)
};
