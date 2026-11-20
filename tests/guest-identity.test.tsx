import {jest} from '@jest/globals';
import {guestSecret,clientAddress,clientAddressWarning,guestNickname,newGuest,requestIpHash,signGuestIdentity,verifyGuestIdentity,warnAboutClientAddress} from '../src/server/guest-identity';

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
 const names=['AUTH_SECRET','NODE_ENV','GUEPARD_TRUST_PROXY','GUEPARD_CLIENT_IP_HEADER',...Object.keys(values)],saved=new Map(names.map(name=>[name,process.env[name]]));
 process.env.AUTH_SECRET='test-secret';delete process.env.GUEPARD_TRUST_PROXY;delete process.env.GUEPARD_CLIENT_IP_HEADER;
 for(const [name,value]of Object.entries(values))if(value===undefined)delete process.env[name];else process.env[name]=value;
 try{await run()}finally{for(const [name,value]of saved)if(value===undefined)delete process.env[name];else process.env[name]=value}
}
test('behind a declared proxy distinct client addresses get distinct fingerprints instead of one site-wide bucket',()=>withEnv({GUEPARD_TRUST_PROXY:'1'},async()=>{
 const first=await requestIpHash(fakeRequest({'x-forwarded-for':'203.0.113.9'})),second=await requestIpHash(fakeRequest({'x-forwarded-for':'198.51.100.4'}));
 expect(first).not.toBe(second);
 expect(first).not.toContain('203.0.113.9');
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'203.0.113.9'}))).toBe(first);
}));
test('spoofed left-most forwarded entries are ignored; the address appended by the trusted proxy wins',()=>withEnv({GUEPARD_TRUST_PROXY:'1'},async()=>{
 const real=await requestIpHash(fakeRequest({'x-forwarded-for':'203.0.113.9'}));
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'1.1.1.1, 203.0.113.9','x-real-ip':'8.8.8.8'}))).toBe(real);
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'2.2.2.2,203.0.113.9:4411'}))).toBe(real);
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'::ffff:203.0.113.9'}))).toBe(real);
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'203.0.113.9, 1.1.1.1'}))).not.toBe(real);
 expect(await requestIpHash(fakeRequest({'x-forwarded-for':'1.1.1.1, not-an-ip'}))).toBe(await requestIpHash(fakeRequest({})));
}));
test('proxy hop count and a platform client-IP header are configurable',async()=>{
 await withEnv({GUEPARD_TRUST_PROXY:'2'},async()=>{
  expect(await requestIpHash(fakeRequest({'x-forwarded-for':'1.1.1.1, 203.0.113.9, 10.0.0.2'}))).toBe(await requestIpHash(fakeRequest({'x-forwarded-for':'9.9.9.9, 203.0.113.9, 10.0.0.7'})));
 });
 await withEnv({GUEPARD_CLIENT_IP_HEADER:'X-Real-IP'},async()=>{
  const real=await requestIpHash(fakeRequest({'x-real-ip':'203.0.113.9','x-forwarded-for':'10.0.0.2'}));
  expect(real).toBe(await requestIpHash(fakeRequest({'x-real-ip':'203.0.113.9','x-forwarded-for':'10.0.0.3'})));
  expect(real).not.toBe(await requestIpHash(fakeRequest({'x-real-ip':'198.51.100.4','x-forwarded-for':'10.0.0.2'})));
 });
});
test('without a declared proxy, a client-written X-Forwarded-For is never trusted',()=>withEnv({},async()=>{
 const shared=await requestIpHash(fakeRequest({}));
 for(const forged of ['203.0.113.9','198.51.100.4','1.1.1.1, 203.0.113.9'])expect(await requestIpHash(fakeRequest({'x-forwarded-for':forged}))).toBe(shared);
 expect(clientAddress(fakeRequest({'x-forwarded-for':'203.0.113.9','x-real-ip':'198.51.100.4'}))).toBe('unknown');
}));
test('an invalid proxy count is not trusted either, and a configured platform header is used without GUEPARD_TRUST_PROXY',async()=>{
 await withEnv({GUEPARD_TRUST_PROXY:'true'},async()=>{expect(clientAddress(fakeRequest({'x-forwarded-for':'203.0.113.9'}))).toBe('unknown')});
 await withEnv({GUEPARD_CLIENT_IP_HEADER:'X-Real-IP'},async()=>{
  expect(clientAddress(fakeRequest({'x-real-ip':'203.0.113.9','x-forwarded-for':'198.51.100.4'}))).toBe('203.0.113.9');
  expect(clientAddress(fakeRequest({'x-forwarded-for':'198.51.100.4'}))).toBe('unknown');
 });
});
test('production without a declared proxy (or with an invalid count) logs a warning at start-up',async()=>{
 await withEnv({NODE_ENV:'production'},async()=>{
  expect(clientAddressWarning()).toMatch(/GUEPARD_TRUST_PROXY/);
  const warn=jest.spyOn(console,'warn').mockImplementation(()=>undefined);
  try{warnAboutClientAddress();expect(warn).toHaveBeenCalledWith(expect.stringMatching(/GUEPARD_CLIENT_IP_HEADER/))}finally{warn.mockRestore()}
 });
 await withEnv({NODE_ENV:'production',GUEPARD_TRUST_PROXY:'abc'},async()=>{expect(clientAddressWarning()).toMatch(/abc/)});
 await withEnv({NODE_ENV:'production',GUEPARD_TRUST_PROXY:'1'},async()=>{expect(clientAddressWarning()).toBeUndefined()});
 await withEnv({NODE_ENV:'production',GUEPARD_CLIENT_IP_HEADER:'X-Real-IP'},async()=>{expect(clientAddressWarning()).toBeUndefined()});
 await withEnv({NODE_ENV:'development'},async()=>{expect(clientAddressWarning()).toBeUndefined()});
});
test('IPv6 clients are grouped by /64 prefix, IPv4 clients keep their full address',()=>withEnv({GUEPARD_TRUST_PROXY:'1'},async()=>{
 const hash=(address:string)=>requestIpHash(fakeRequest({'x-forwarded-for':address}));
 const prefix=await hash('2001:db8:1:2::1');
 for(const same of ['2001:db8:1:2:ffff:abcd:1234:9','2001:0DB8:0001:0002:0000:0000:0000:0001','[2001:db8:1:2::42]:443','2001:db8:1:2::10.0.0.1'])expect(await hash(same)).toBe(prefix);
 expect(await hash('2001:db8:1:3::1')).not.toBe(prefix);
 expect(clientAddress(fakeRequest({'x-forwarded-for':'2001:db8:1:2:aaaa::1'}))).toBe('2001:db8:1:2::/64');
 expect(clientAddress(fakeRequest({'x-forwarded-for':'::1'}))).toBe('0:0:0:0::/64');
 expect(await hash('203.0.113.9')).not.toBe(await hash('203.0.113.10'));
 await withEnv({GUEPARD_CLIENT_IP_HEADER:'CF-Connecting-IP'},async()=>{
  expect(clientAddress(fakeRequest({'cf-connecting-ip':'2001:db8:9:8:7:6:5:4'}))).toBe('2001:db8:9:8::/64');
 });
}));
test('production without AUTH_SECRET refuses to start and tells how to generate one',()=>withEnv({NODE_ENV:'production',AUTH_SECRET:undefined},async()=>{
 expect(()=>guestSecret()).toThrow(/openssl rand -hex 32/);
}));
