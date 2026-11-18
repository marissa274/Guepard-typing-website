import {cookies} from 'next/headers';
import {currentUser} from './auth-store';
import {guestCookieName,guestLifetime,guestNickname,guestSecret,newGuest,requestIpHash,signGuestIdentity,verifyGuestIdentity} from './guest-identity';

export async function roomIdentity(body:Record<string,unknown>,request?:Request){
 const jar=await cookies(),token=jar.get('guepard_session')?.value;
 const account=token?await currentUser(token):null,ipHash=await requestIpHash(request);
 if(account)return {...body,nickname:account.username,avatar:account.avatar,avatarUrl:account.avatarUrl,kind:'demo',userId:account.id,identityKey:'user:'+account.id,ipHash};
 const secret=await guestSecret(),existing=verifyGuestIdentity(jar.get(guestCookieName)?.value,secret);
 const name=guestNickname(body.nickname===undefined?existing?.name:body.nickname),guest=existing?{...existing,name,expires:Date.now()+guestLifetime*1000}:newGuest(name);
 jar.set(guestCookieName,signGuestIdentity(guest,secret),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:guestLifetime});
 return {...body,nickname:name,kind:'guest',avatar:'cheetah',avatarUrl:undefined,userId:undefined,identityKey:'guest:'+guest.id,ipHash};
}
