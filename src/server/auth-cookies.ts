export const sessionCookie='guepard_session';
export const authCookieOptions={httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/'};
export const oauthCookie=(provider:string)=>`guepard_oauth_${provider}`;
