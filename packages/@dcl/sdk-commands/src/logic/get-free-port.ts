import * as net from 'net'

// search upward from 8000 (portfinder's contract) so the preview URL stays stable across runs
const BASE_PORT = 8000
const HIGHEST_PORT = 65535

function tryListen(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', reject)
    // probe the same address the servers bind (HTTP_SERVER_HOST=0.0.0.0): a hostless
    // listen binds the IPv6 wildcard, which on macOS coexists with an IPv4 listener
    // and reports ports as free that the real server then fails to bind (EADDRINUSE)
    server.listen(port, '0.0.0.0', () => {
      const address = server.address()
      server.close(() => resolve(typeof address === 'object' && address ? address.port : port))
    })
  })
}

export async function getPort(port: number, failoverPort = 2044) {
  const resolvedPort = port && Number.isInteger(port) ? +port : 0

  if (!resolvedPort) {
    for (let candidate = BASE_PORT; candidate <= HIGHEST_PORT; candidate++) {
      try {
        return await tryListen(candidate)
      } catch {
        // busy, try the next one
      }
    }
    return failoverPort
  }

  return resolvedPort
}
