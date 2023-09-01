import { dirname, resolve } from 'path'
import { Router } from '@well-known-components/http-server'
import { IFuture } from 'fp-future'

import { CliComponents } from '../../../components'
import { LinkerResponse } from './api'
import { CreateQuest, QuestLinkerActionType } from '../types'

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
  info: { messageToSign: string; extraData?: { questName?: string; questId?: string; createQuest?: CreateQuest } },
  actionType: QuestLinkerActionType,
  linkerCallback: (value: LinkerResponse) => Promise<void>
) {
  // We need to wait so the linker-dapp can receive the response and show a nice message.
  const resolveLinkerPromise = () => setTimeout(() => awaitResponse.resolve(), 100)
  const { fs, logger } = components
  const router = new Router()
  const linkerDapp = dirname(require.resolve('@dcl/linker-dapp/package.json'))

  router.get(`/quests`, async () => ({
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

  router.get('/api/quests', async () => ({
    body: { ...info, actionType }
  }))

  router.post('/api/quests', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.signature) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      logger.error(errorMessage)
      resolveLinkerPromise()
      return { status: 400, body: { message: errorMessage } }
    }

    try {
      await linkerCallback(value)
      resolveLinkerPromise()
      return {}
    } catch (e) {
      resolveLinkerPromise()
      return { status: 400, body: { message: (e as Error).message } }
    }
  })

  return { router }
}
