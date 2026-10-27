import { AuthChain } from '@dcl/crypto'

const AUTH_CHAIN_HEADER_PREFIX = 'x-identity-auth-chain-'
const AUTH_TIMESTAMP_HEADER = 'x-identity-timestamp'
const AUTH_METADATA_HEADER = 'x-identity-metadata'

/**
 * Creates HTTP headers from an auth chain following ADR-44 (Signed Fetch) format.
 * Used for authenticated requests to Decentraland services.
 *
 * @param authChain - The authentication chain from the linker dApp or wallet signing
 * @param timestamp - Unix timestamp of the request
 * @param metadata - JSON string with request metadata (e.g., { key, value, world })
 * @returns Record of HTTP headers to include in the request
 */
export function createAuthChainHeaders(
  authChain: AuthChain,
  timestamp: string,
  metadata: string
): Record<string, string> {
  const headers: Record<string, string> = {}

  authChain.forEach((link, i) => {
    headers[AUTH_CHAIN_HEADER_PREFIX + i] = JSON.stringify(link)
  })

  headers[AUTH_TIMESTAMP_HEADER] = timestamp
  headers[AUTH_METADATA_HEADER] = metadata

  return headers
}
