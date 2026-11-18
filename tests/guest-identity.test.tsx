import {guestNickname,newGuest,requestIpHash,signGuestIdentity,verifyGuestIdentity} from '../src/server/guest-identity';

test('guest cookies preserve a stable signed identity and reject tampering, expiry and another secret',()=>{
 const guest=newGuest('Invité Jungle'),token=signGuestIdentity(guest,'test-secret');
 expect(verifyGuestIdentity(token,'test-secret')).toEqual(guest);
 expect(verifyGuestIdentity(token,'other-secret')).toBeNull();
 const [,signature]=token.split('.'),changed=Buffer.from(JSON.stringify({...guest,name:'Intrus'})).toString('base64url')+'.'+signature;
 expect(verifyGuestIdentity(changed,'test-secret')).toBeNull();
 expect(verifyGuestIdentity(signGuestIdentity({...guest,expires:1},'test-secret'),'test-secret')).toBeNull();
 expect(verifyGuestIdentity('malformed','test-secret')).toBeNull();
});
test('guest nicknames allow 3 to 20 characters and reject control characters',()=>{
 expect(guestNickname('  Ami  ')).toBe('Ami');
 for(const invalid of ['',null,'ab','a'.repeat(21),'Ami\nJungle'])expect(()=>guestNickname(invalid)).toThrow();
});
test('forwarded IPs are ignored unless the deployment explicitly trusts its proxy',async()=>{
 const oldSecret=process.env.AUTH_SECRET,oldProxy=process.env.GUEPARD_TRUST_PROXY;
 process.env.AUTH_SECRET='test-secret';
 const request={headers:{get:()=> '203.0.113.9, 127.0.0.1'}} as unknown as Request;
 try{
  delete process.env.GUEPARD_TRUST_PROXY;const local=await requestIpHash();expect(await requestIpHash(request)).toBe(local);
  process.env.GUEPARD_TRUST_PROXY='1';expect(await requestIpHash(request)).not.toBe(local);expect(await requestIpHash(request)).not.toContain('203.0.113.9');
 }finally{if(oldSecret===undefined)delete process.env.AUTH_SECRET;else process.env.AUTH_SECRET=oldSecret;if(oldProxy===undefined)delete process.env.GUEPARD_TRUST_PROXY;else process.env.GUEPARD_TRUST_PROXY=oldProxy}
});
