import portfinder from 'portfinder'

export async function previewPort() {
  let resolvedPort = 0

  if (!resolvedPort) {
    try {
      resolvedPort = await portfinder.getPortPromise()
    } catch (e) {
      resolvedPort = 2044
    }
  }

  return resolvedPort
}
