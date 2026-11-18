import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {AuthError,requireAccount,putAvatar,removeAvatar} from '../../../../src/server/auth-store';
import {maxAvatarBytes,prepareAvatar} from '../../../../src/server/avatar-image';
import {isAllowedOrigin} from '../../../../src/server/request-origin';
import {sessionCookie} from '../../../../src/server/auth-cookies';
import {readLimitedBody} from '../../../../src/server/request-body';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function failure(error:unknown){return NextResponse.json({error:error instanceof AuthError?error.message:'Impossible de modifier la photo. Réessayez.'},{status:error instanceof AuthError?error.status:503})}
export async function POST(request:Request){
 if(!isAllowedOrigin(request))return NextResponse.json({error:'Origine non autorisée.'},{status:403});
 try{
  const token=(await cookies()).get(sessionCookie)?.value;await requireAccount(token);
  const length=Number(request.headers.get('content-length')||0);
  if(length>maxAvatarBytes+64*1024)throw new AuthError('La photo ne doit pas dépasser 2 Mo.',413);
  const bytes=await readLimitedBody(request.body,maxAvatarBytes+64*1024);
  let form:FormData;
  try{form=await new Response(new Uint8Array(bytes),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData()}
  catch{throw new AuthError('Formulaire photo invalide.')}
  const photo=form.get('photo');
  if(!photo||typeof photo==='string'||!('arrayBuffer' in photo))throw new AuthError('Choisissez une photo.');
  if(photo.size>maxAvatarBytes)throw new AuthError('La photo ne doit pas dépasser 2 Mo.',413);
  const image=await prepareAvatar(Buffer.from(await photo.arrayBuffer()),photo.type);
  return NextResponse.json({user:await putAvatar(token,image)});
 }catch(error){return failure(error)}
}
export async function DELETE(request:Request){
 if(!isAllowedOrigin(request))return NextResponse.json({error:'Origine non autorisée.'},{status:403});
 try{return NextResponse.json({user:await removeAvatar((await cookies()).get(sessionCookie)?.value)})}catch(error){return failure(error)}
}
