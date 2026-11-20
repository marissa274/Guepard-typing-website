/** Runs once when the Next.js server starts: reports a production configuration that cannot identify clients (C2-B2). */
export async function register(){
 // Positive guard so the bundler drops the Node-only import from the Edge build (node:crypto is unavailable there).
 if(process.env.NEXT_RUNTIME==='nodejs'){
  const {warnAboutClientAddress}=await import('./src/server/guest-identity');
  warnAboutClientAddress();
 }
}
