import portfinder from 'portfinder'

export async function getPort(port = 0, failoverPort = 2044) {
  let resolvedPort = port

  if (!resolvedPort) {
    try {
      resolvedPort = await portfinder.getPortPromise({ port: resolvedPort })
    } catch (e) {
      resolvedPort = failoverPort
    }
  }

  return resolvedPort
}
