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
function fakeRequest(headers:Record<string,string>):Request{return {headers:{get:(name:string)=>headers[name.toLowerCase()]??null}} as unknown as Request}
async function withEnv(values:Record<string,string|undefined>,run:()=>Promise<void>){
 const names=['AUTH_SECRET','GUEPARD_TRUST_PROXY','GUEPARD_CLIENT_IP_HEADER',...Object.keys(values)],saved=new Map(names.map(name=>[name,process.env[name]]));
 process.env.AUTH_SECRET='test-secret';delete process.env.GUEPARD_TRUST_PROXY;delete process.env.GUEPARD_CLIENT_IP_HEADER;
 for(const [name,value]of Object.entries(values))if(value===undefined)delete process.env[name];else process.env[name]=value;
 try{await run()}finally{for(const [name,value]of saved)if(value===undefined)delete process.env[name];else process.env[name]=value}
}
test('C1-B4: by default distinct client addresses get distinct fingerprints instead of one site-wide bucket',()=>withEnv({},async()=>{
 const first=await requestIpHash(fakeRequest({'x-forwarded-for':'203.0.113.9'})),second=await requestIpHash(fakeRequest({'x-forwarded-for':'198.51.100.4'}));
 expect(first).not.toBe(second);
 expect(first).not.toContain('203.0.113.9');
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'203.0.113.9'}))).toBe(first);
}));
test('C1-B4: spoofed left-most forwarded entries are ignored; the address appended by the trusted proxy wins',()=>withEnv({},async()=>{
 const real=await requestIpHash(fakeRequest({'x-forwarded-for':'203.0.113.9'}));
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'1.1.1.1, 203.0.113.9','x-real-ip':'8.8.8.8'}))).toBe(real);
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'2.2.2.2,203.0.113.9:4411'}))).toBe(real);
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'::ffff:203.0.113.9'}))).toBe(real);
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'203.0.113.9, 1.1.1.1'}))).not.toBe(real);
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'1.1.1.1, not-an-ip'}))).toBe(await requestIpHash(fakeRequest({})));
}));
test('C1-B4: proxy hop count and a platform client-IP header are configurable',async()=>{
 await withEnv({GUEPARD_TRUST_PROXY:'2'},async()=>{
  expect(await requestIpHash(fakeRequest({'x-forwarded-for':'1.1.1.1, 203.0.113.9, 10.0.0.2'}))).toBe(await requestIpHash(fakeRequest({'x-forwarded-for':'9.9.9.9, 203.0.113.9, 10.0.0.7'})));
 });
 await withEnv({GUEPARD_CLIENT_IP_HEADER:'X-Real-IP'},async()=>{
  const real=await requestIpHash(fakeRequest({'x-real-ip':'203.0.113.9','x-forwarded-for':'10.0.0.2'}));
  expect(real).toBe(await requestIpHash(fakeRequest({'x-real-ip':'203.0.113.9','x-forwarded-for':'10.0.0.3'})));
  expect(real).not.toBe(await requestIpHash(fakeRequest({'x-real-ip':'198.51.100.4','x-forwarded-for':'10.0.0.2'})));
 });
});
