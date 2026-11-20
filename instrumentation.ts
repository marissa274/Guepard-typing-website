/** Runs once when the Next.js server starts: refuses to start in production without AUTH_SECRET, and reports a production configuration that cannot identify clients (C2-B2). */
export async function register(){
 // Positive guard so the bundler drops the Node-only import from the Edge build (node:crypto is unavailable there).
 if(process.env.NEXT_RUNTIME==='nodejs'){
  const {guestSecret,warnAboutClientAddress}=await import('./src/server/guest-identity');
  // Fail at startup, not on the first room request, when production has no AUTH_SECRET.
  if(process.env.NODE_ENV==='production')await guestSecret();
  warnAboutClientAddress();
 }
}
