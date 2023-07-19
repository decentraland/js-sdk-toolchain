import { dirname, resolve } from 'path'
import { Router } from '@well-known-components/http-server'
import { ChainId } from '@dcl/schemas'
import { IFuture } from 'fp-future'

import { getPointers } from '../../../logic/catalyst-requests'
import { getObject } from '../../../logic/coordinates'
import { CliComponents } from '../../../components'
import { IFile } from '../../../logic/scene-validations'
import { LinkerResponse, SceneInfo } from './api'

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

export function setRoutes(
  components: Pick<CliComponents, 'fs' | 'logger' | 'fetch' | 'config'>,
  awaitResponse: IFuture<void>,
  files: IFile[],
  sceneInfo: SceneInfo,
  linkerCallback: (value: LinkerResponse) => Promise<void>,
) {
  // We need to wait so the linker-dapp can receive the response and show a nice message.
  const resolveLinkerPromise = () => setTimeout(() => awaitResponse.resolve(), 100)
  const { fs, logger } = components
  const router = new Router()
  const linkerDapp = dirname(require.resolve('@dcl/linker-dapp/package.json'))
  let linkerResponse: LinkerResponse

  router.get('/', async () => ({
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
    body: sceneInfo
  }))

  router.get('/api/files', async () => ({
    body: files.map((file) => ({
      name: file.path,
      size: file.size
    }))
  }))

  router.get('/api/catalyst-pointers', async () => {
    const { x, y } = getObject(sceneInfo.baseParcel)
    const pointer = `${x},${y}`
    const chainId = linkerResponse?.chainId || 1
    const network = chainId === ChainId.ETHEREUM_MAINNET ? 'mainnet' : 'goerli'
    const value = await getPointers(components, pointer, network)
    const deployedToAll = new Set(value.map(c => c.entityId)).size === 1

    // Deployed to every catalyst, close the linker dapp and
    // exit the command automatically so the user dont have to.
    if (deployedToAll) resolveLinkerPromise()

    return {
      body: { catalysts: value }
    }
  })

  router.post('/api/deploy', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.signature || !value.chainId) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      logger.error(errorMessage)
      resolveLinkerPromise()
      return { status: 400, body: { message: errorMessage} }
    }

    // Store the chainId so we can use it on the catalyst pointers.
    linkerResponse =  value

    try {
      await linkerCallback(value)
      // If its a world we dont wait for the catalyst pointers.
      // Close the program.
      if (sceneInfo.isWorld) {
        resolveLinkerPromise()
      }
      return {}
    } catch (e) {
      resolveLinkerPromise()
      return { status: 400, body: { message: (e as Error).message } }
    }
  })

  return { router }
}
