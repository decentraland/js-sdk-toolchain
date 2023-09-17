import { dirname, resolve } from 'path'
import { Router } from '@well-known-components/http-server'

import { CliComponents } from '../components'
import { ChainId } from '@dcl/schemas'

/**
 * Set common routes to use on Linker dApp
 * @param components Server components
 * @param info Info to be sent within /api/info body response
 * @param mainRoute route to return the Linker dApp
 */
export function setRoutes<T extends { [key: string]: any }>(
  components: Pick<CliComponents, 'fs' | 'logger' | 'fetch' | 'config'>,
  info: T,
  mainRoute = '/'
) {
  const { fs } = components
  const router = new Router()
  const linkerDapp = dirname(require.resolve('@dcl/linker-dapp/package.json'))

  router.get(mainRoute, async () => ({
    headers: { 'Content-Type': 'text/html' },
    body: fs.createReadStream(resolve(linkerDapp, 'index.html'))
  }))

  router.get('/static/:type/:path', async (ctx) => {
    const contentType = getContentType(ctx.params.type)
    return {
      headers: { 'Content-Type': contentType },
      body: fs.createReadStream(resolve(linkerDapp, 'static', ctx.params.type, ctx.params.path))
    }
  })

  router.get('/manifest.json', async () => ({
    headers: { 'Content-Type': 'application/json' },
    body: fs.createReadStream(resolve(linkerDapp, 'manifest.json'))
  }))

  router.get('/api/info', async () => ({
    body: info
  }))

  return { router }
}

function getContentType(type: string) {
  switch (type) {
    case 'css':
      return 'text/css'
    case 'js':
      return 'application/js'
    case 'media':
    default:
      return 'text/plain'
  }
}

export interface LinkerResponse {
  address: string
  signature: string
  chainId?: ChainId
}
