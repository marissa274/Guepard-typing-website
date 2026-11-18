import {AuthError} from './auth-error';

/** Bound streaming requests as well as requests with a Content-Length header. */
export async function readLimitedBody(body:ReadableStream<Uint8Array>|null,maximumBytes:number):Promise<Buffer>{
 if(!body)return Buffer.alloc(0);
 const reader=body.getReader(),chunks:Uint8Array[]=[];
 let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>maximumBytes){await reader.cancel();throw new AuthError('Requête trop volumineuse.',413)}
   chunks.push(value);
  }
  return Buffer.concat(chunks,size);
 }finally{reader.releaseLock()}
}
