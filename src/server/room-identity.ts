import {cookies} from 'next/headers';
import {currentUser} from './auth-store';

export async function roomIdentity(body:any){
 const token=(await cookies()).get('guepard_session')?.value;
 const account=token?await currentUser(token):null;
 return account?{...body,nickname:account.username,avatar:account.avatar,kind:'demo'}:{...body,kind:'guest',avatar:'cheetah'};
}
