/** Match browser origins against server-configured public URLs, not proxy headers. */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const configuredUrls = [process.env.APP_URL];
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    configuredUrls.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }

  const allowed = new Set<string>();
  for (const value of configuredUrls) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        allowed.add(url.origin);
      }
    } catch {
      // Invalid configuration must not authorize an arbitrary origin.
    }
  }

  // Preserve local development and deployments without a public URL configured.
  if (process.env.NODE_ENV !== 'production' || !configuredUrls.some(Boolean)) {
    allowed.add(new URL(request.url).origin);
  }

  return allowed.has(origin);
}
