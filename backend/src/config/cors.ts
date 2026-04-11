function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isLocalFrontendOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function isAllowedCorsOrigin(origin: string | undefined, allowedOrigins: string[] | string): boolean {
  if (!origin) return true;
  if (allowedOrigins === '*') return true;
  if (isLocalFrontendOrigin(origin)) return true;
  return Array.isArray(allowedOrigins) ? allowedOrigins.includes(origin) : allowedOrigins === origin;
}
