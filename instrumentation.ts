/** Runs once when the Next.js server starts: reports a production configuration that cannot identify clients (C2-B2). */
export async function register(){
 if(process.env.NEXT_RUNTIME!=='nodejs')return;
 const {warnAboutClientAddress}=await import('./src/server/guest-identity');
 warnAboutClientAddress();
}
