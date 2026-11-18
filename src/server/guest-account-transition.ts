import {cookies} from 'next/headers';
import type {Account} from '../lib/auth-types';
import {guestCookieName,guestSecret,verifyGuestIdentity} from './guest-identity';
import {adoptGuestMembership} from './room-service';

export async function adoptCurrentGuest(user:Account){
 const value=(await cookies()).get(guestCookieName)?.value;
 if(!value)return;
 const guest=verifyGuestIdentity(value,await guestSecret());
 if(guest)await adoptGuestMembership(user,guest.id);
}
