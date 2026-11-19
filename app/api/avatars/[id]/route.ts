import {readAvatar} from '../../../../src/server/auth-store';
import {avatarIdSchema} from '../../../../src/server/schemas';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const id=avatarIdSchema.safeParse((await params).id);
  if(!id.success)return new Response(null,{status:404});
  const image=await readAvatar(id.data);
  if(!image)return new Response(null,{status:404});
  return new Response(new Uint8Array(image.data),{headers:{'Content-Type':'image/webp','Content-Length':String(image.data.length),'Cache-Control':'public, max-age=300','ETag':`"${image.version}"`,'X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:503})}
}
