/**
 * `BADGES_SERVER_URL`: the badges service a preview forwards award requests to. It must
 * be an origin (scheme, host, port): the award is ADR-44 signed over its path, so a path
 * segment here would break the signature check at the service. A trailing slash is fine.
 *
 * Returns the normalized origin, or undefined when the variable is unset.
 */
export function getBadgesServerUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw = env.BADGES_SERVER_URL?.trim()
  if (!raw) return undefined

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`BADGES_SERVER_URL is not a valid URL: ${raw}`)
  }
  if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error(`BADGES_SERVER_URL must be an origin with no path, query or fragment: ${raw}`)
  }
  return url.origin
}
