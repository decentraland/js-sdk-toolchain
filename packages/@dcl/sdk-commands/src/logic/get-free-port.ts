import portfinder from 'portfinder'

export async function getPort(port: number, failoverPort = 2044) {
  let resolvedPort = port && Number.isInteger(port) ? +port : 0

  if (!resolvedPort) {
    try {
      resolvedPort = await portfinder.getPortPromise({ port: resolvedPort })
    } catch (e) {
      resolvedPort = failoverPort
    }
  }

  return resolvedPort
}
