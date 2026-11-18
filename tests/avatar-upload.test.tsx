import {expect,test} from '@jest/globals';
import sharp from 'sharp';
import {prepareAvatar} from '../src/server/avatar-image';

test('JPEG, PNG and WebP are decoded and resized to a metadata-free WebP avatar',async()=>{
 for(const format of ['jpeg','png','webp'] as const){
  const source=await sharp({create:{width:640,height:400,channels:3,background:'#338855'}})[format]().toBuffer();
  const converted=await prepareAvatar(source,`image/${format}`),metadata=await sharp(converted).metadata();
  expect(metadata.format).toBe('webp');expect(metadata.width).toBe(256);expect(metadata.height).toBe(256);expect(metadata.exif).toBeUndefined();
 }
});
test('oversized bytes, incorrect declared MIME, SVG, GIF and corrupt images are rejected',async()=>{
 await expect(prepareAvatar(Buffer.alloc(2*1024*1024+1),'image/png')).rejects.toMatchObject({status:413});
 const png=await sharp({create:{width:2,height:2,channels:3,background:'#338855'}}).png().toBuffer();
 await expect(prepareAvatar(png,'image/jpeg')).rejects.toMatchObject({status:400});
 await expect(prepareAvatar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),'image/png')).rejects.toMatchObject({status:400});
 const gif=await sharp({create:{width:2,height:2,channels:3,background:'#338855'}}).gif().toBuffer();
 await expect(prepareAvatar(gif,'image/gif')).rejects.toMatchObject({status:400});
 await expect(prepareAvatar(Buffer.from([137,80,78,71,13,10,26,10]),'image/png')).rejects.toMatchObject({status:400});
});
