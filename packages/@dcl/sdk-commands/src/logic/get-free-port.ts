import * as net from 'net'

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
    try {
      return await tryListen(0)
    } catch (e) {
      return failoverPort
    }
  }

  return resolvedPort
}
