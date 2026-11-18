import sharp from 'sharp';
import {AuthError} from './auth-error';
export const maxAvatarBytes=2*1024*1024;
const mimeTypes:Record<string,string>={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};

/** Decode the image rather than trusting a filename or the multipart Content-Type. */
export async function prepareAvatar(bytes:Buffer,declaredType:string):Promise<Buffer>{
 if(bytes.length>maxAvatarBytes)throw new AuthError('La photo ne doit pas dépasser 2 Mo.',413);
 if(!bytes.length||!Object.values(mimeTypes).includes(declaredType))throw new AuthError('Choisissez une image JPEG, PNG ou WebP.');
 try{
  const image=sharp(bytes,{limitInputPixels:16_000_000,failOn:'error'}),metadata=await image.metadata();
  if(!metadata.format||mimeTypes[metadata.format]!==declaredType||!metadata.width||!metadata.height||(metadata.pages||1)>1)throw new Error('Invalid image format');
  return await image.rotate().resize(256,256,{fit:'cover'}).webp({quality:82}).toBuffer();
 }catch{throw new AuthError('La photo est invalide. Choisissez une image JPEG, PNG ou WebP non animée.');}
}
