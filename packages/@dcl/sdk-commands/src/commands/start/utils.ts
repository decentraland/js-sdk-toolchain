import * as os from 'os'

/**
 * Get the LAN IP address for external device access (e.g., mobile preview)
 */
export function getLanIp(): string | undefined {
  const networkInterfaces = os.networkInterfaces()
  return Object.values(networkInterfaces)
    .flat()
    .find((details) => details?.family === 'IPv4' && !details.internal && details.address !== '127.0.0.1')?.address
}

/**
 * Get the full LAN URL with protocol for external device access
 */
export function getLanUrl(port: number | string): string | undefined {
  const ip = getLanIp()
  if (!ip) return undefined
  return `http://${ip}:${port}`
}
