import { dirname, resolve } from 'path'
import urlParse from 'url'
import { Router } from '@well-known-components/http-server'
import { ChainId } from '@dcl/schemas'
import future from 'fp-future'

import { getPointers } from './catalyst-pointers'
import { getObject } from '../../../logic/coordinates'
import { CliComponents } from '../../../components'
import { IFile } from '../../../logic/scene-validations'
import { LinkerResponse, SceneInfo } from './api'

type DeployInfo = {
  linkerResponse?: LinkerResponse
  status?: 'deploying' | 'success'
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

export function setRoutes(
  components: Pick<CliComponents, 'fs' | 'logger' | 'fetch'>,
  files: IFile[],
  sceneInfo: SceneInfo
) {
  const futureSignature = future<LinkerResponse>()
  const { fs, logger } = components
  const router = new Router()
  const linkerDapp = dirname(require.resolve('@dcl/linker-dapp/package.json'))
  let deployInfo: DeployInfo = {}

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
    const chainId = deployInfo.linkerResponse?.chainId || 1
    const network = chainId === ChainId.ETHEREUM_MAINNET ? 'mainnet' : 'goerli'
    const value = await getPointers(components, pointer, network)

    return {
      body: {
        catalysts: value,
        status: deployInfo.status ?? ''
      }
    }
  })

  router.get('/api/close', async (ctx) => {
    const { ok, reason } = urlParse.parse(ctx.url.toString(), true).query

    if (ok === 'true') {
      const value = JSON.parse(reason?.toString() || '{}') as LinkerResponse
      deployInfo = { ...deployInfo, linkerResponse: value }
      futureSignature.resolve(value)
      return {}
    }

    futureSignature.reject(new Error(`Failed to link: ${reason}`))
    return {}
  })

  router.post('/api/deploy', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.signature || !value.chainId) {
      logger.error(`Invalid payload: ${Object.keys(value).join(' - ')}`)
      return {}
    }

    deployInfo = { ...deployInfo, linkerResponse: value, status: 'deploying' }
    futureSignature.resolve(value)
    return {}
  })

  return { router, futureSignature }
}
