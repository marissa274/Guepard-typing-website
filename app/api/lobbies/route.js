import {createLobby,getLobby,listLobbies,changeLobby} from '../../../src/server/lobbies';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function token(request){return request.headers.get('authorization')?.replace(/^Bearer /,'')||''}
function error(e){return Response.json({error:e.status?e.message:'Le serveur ne peut pas répondre pour le moment.'},{status:e.status||500})}
export async function GET(request){try{const code=new URL(request.url).searchParams.get('code');return Response.json(code?{room:getLobby(code,token(request))}:{rooms:listLobbies()},{headers:{'Cache-Control':'no-store'}})}catch(e){return error(e)}}
export async function POST(request){try{if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origine non autorisée.'},{status:403});const raw=await request.text();if(raw.length>4096)return Response.json({error:'Requête trop volumineuse.'},{status:413});let body;try{body=JSON.parse(raw)}catch{return Response.json({error:'Requête invalide.'},{status:400})}if(!body||typeof body!=='object')return Response.json({error:'Requête invalide.'},{status:400});return Response.json(body.action==='create'?createLobby(body):changeLobby(body.code,token(request),body))}catch(e){return error(e)}}
