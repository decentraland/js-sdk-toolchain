import net from 'net'
import portfinder from 'portfinder'
import { CliError } from './error'

/**
 * Only EADDRINUSE means "taken". Any other bind failure (EACCES on a privileged
 * port, EADDRNOTAVAIL) is not the orphaned-server case this guard is about, and
 * the server itself will report it with a better message.
 */
function isPortTaken(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer()
    probe.once('error', (error: NodeJS.ErrnoException) => resolve(error.code === 'EADDRINUSE'))
    probe.once('listening', () => probe.close(() => resolve(false)))
    probe.listen(port, '0.0.0.0')
  })
}

export async function getPort(port: number, failoverPort = 2044) {
  const requestedPort = port && Number.isInteger(port) ? +port : 0

  if (!requestedPort) {
    try {
      return await portfinder.getPortPromise({ port: 0 })
    } catch (e) {
      return failoverPort
    }
  }

  // Without this check an explicit port only fails when the http server binds it,
  // as a raw EADDRINUSE stack trace with no hint about what is holding it.
  if (await isPortTaken(requestedPort)) {
    throw new CliError(
      'PORT_ALREADY_IN_USE',
      `Port ${requestedPort} is already in use. A previous run may have left an orphaned server behind: close it (on macOS/Linux \`lsof -ti:${requestedPort} | xargs kill\`, on Windows \`netstat -ano | findstr :${requestedPort}\` then \`taskkill /pid <pid> /F\`) or start again with a different --port.`
    )
  }

  return requestedPort
}
