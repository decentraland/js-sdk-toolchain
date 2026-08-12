import * as net from 'net'

// search upward from 8000 (portfinder's contract) so the preview URL stays stable across runs
const BASE_PORT = 8000
const HIGHEST_PORT = 65535

function tryListen(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', reject)
    server.listen(port, () => {
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
      } catch (err: any) {
        // EADDRINUSE means "busy, try the next one". Any other error (e.g. EACCES on
        // privileged ports, unexpected system failures) isn't going to resolve itself by
        // scanning the remaining ~57k ports, so bail out to the failover port immediately
        // instead of looping needlessly.
        if (err && err.code === 'EADDRINUSE') {
          continue
        }
        return failoverPort
      }
    }
    return failoverPort
  }

  return resolvedPort
}
