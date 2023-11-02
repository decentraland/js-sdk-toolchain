import future, { IFuture } from 'fp-future'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { hexToBytes } from 'eth-connect'
import { Lifecycle } from '@well-known-components/interfaces'
import { Authenticator } from '@dcl/crypto'
import { dirname, resolve } from 'path'
import { Router } from '@well-known-components/http-server'
import { validateStepsAndConnections } from '@dcl/quests-client/dist-cjs/utils'
import prompts from 'prompts'

import { CreateQuest, QuestLinkerActionType } from './types'
import { CliComponents } from '../../components'
import { createWallet } from '../../logic/account'
import { LinkerResponse } from '../../linker-dapp/routes'
import { dAppOptions, runDapp } from '../../run-dapp'
import { setRoutes } from '../../linker-dapp/routes'

async function getAddressAndSignature(
  components: CliComponents,
  linkerOpts: Omit<dAppOptions, 'uri'>,
  awaitResponse: IFuture<void>,
  info: {
    messageToSign: string
    extraData?: { questName?: string; questId?: string; createQuest?: CreateQuest }
    actionType: QuestLinkerActionType
  },
  callback: (signature: LinkerResponse) => Promise<void>
): Promise<{ program?: Lifecycle.ComponentBasedProgram<unknown> }> {
  if (process.env.DCL_PRIVATE_KEY) {
    const wallet = createWallet(process.env.DCL_PRIVATE_KEY)
    const signature = ethSign(hexToBytes(wallet.privateKey), info.messageToSign)
    const linkerResponse = { signature, address: wallet.address }
    await callback(linkerResponse)
    awaitResponse.resolve()
    return {}
  }

  const { router } = setRoutes(components, info, '/quests')
  const { logger } = components

  // We need to wait so the linker-dapp can receive the response and show a nice message.
  const resolveLinkerPromise = () => setTimeout(() => awaitResponse.resolve(), 100)

  router.post('/api/quests', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.signature) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      logger.error(errorMessage)
      resolveLinkerPromise()
      return { status: 400, body: { message: errorMessage } }
    }

    try {
      await callback(value)
      resolveLinkerPromise()
      return {}
    } catch (e) {
      resolveLinkerPromise()
      return { status: 400, body: { message: (e as Error).message } }
    }
  })

  logger.info('You need to sign the request to continue:')
  const { program } = await runDapp(components, router, { ...linkerOpts, uri: `/quests` })

  return { program }
}

export async function executeSubcommand(
  components: CliComponents,
  linkerOps: Omit<dAppOptions, 'uri'>,
  commandData: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    metadata: Record<any, any>
    actionType: QuestLinkerActionType
    extraData?: {
      questName?: string
      questId?: string
      createQuest?: CreateQuest
    }
  },
  commandCallback: (authchainHeaders: Record<string, string>) => Promise<void>
) {
  const awaitResponse = future<void>()

  const timestamp = String(Date.now())

  const pathname = new URL(commandData.url).pathname
  const payload = [commandData.method, pathname, timestamp, JSON.stringify(commandData.metadata)]
    .join(':')
    .toLowerCase()

  const { program } = await getAddressAndSignature(
    components,
    linkerOps,
    awaitResponse,
    { messageToSign: payload, extraData: commandData.extraData, actionType: commandData.actionType },
    async (linkerResponse) => {
      await commandCallback(
        createAuthchainHeaders(
          linkerResponse.address,
          linkerResponse.signature,
          payload,
          timestamp,
          JSON.stringify(commandData.metadata)
        )
      )
    }
  )

  try {
    await awaitResponse
  } finally {
    void program?.stop()
  }
}

export const urlRegex =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_\+.~#?&\/\/=]*)/gm

export const createQuestByPrompting = async (
  _components: Pick<CliComponents, 'logger'>
): Promise<CreateQuest | null> => {
  let cancelled = false

  const onCancel = {
    onCancel: () => {
      cancelled = true
    }
  }

  const { questName } = await prompts(
    {
      type: 'text',
      name: 'questName',
      message: 'How do you want to name your Quest?',
      validate: (questName) => questName.length >= 5
    },
    onCancel
  )

  if (cancelled) return null

  const { description } = await prompts(
    {
      type: 'text',
      name: 'description',
      message: 'Give a description to your Quest',
      validate: (description) => description.length >= 5
    },
    onCancel
  )

  if (cancelled) return null

  const { imageUrl } = await prompts(
    {
      type: 'text',
      name: 'imageUrl',
      message: 'Image URL to display your Quest',
      validate: (imageUrl) => new RegExp(urlRegex).test(imageUrl)
    },
    onCancel
  )

  let { definition } = await prompts(
    {
      type: 'text',
      name: 'definition',
      message: 'Paste the Defintion (Steps & Connections) of your Quest',
      validate: (def) => {
        try {
          const input = JSON.parse(def)
          validateStepsAndConnections({ definition: input })
          return true
        } catch (error) {
          return false
        }
      }
    },
    onCancel
  )
  definition = JSON.parse(definition)

  if (cancelled) return null

  const { withReward } = await prompts(
    {
      type: 'confirm',
      name: 'withReward',
      message: 'Do you want to give rewards to the players?'
    },
    onCancel
  )
  if (cancelled) return null

  if (!withReward) {
    return { name: questName, description, imageUrl, definition }
  }

  const { webhookUrl } = await prompts(
    {
      type: 'text',
      name: 'webhookUrl',
      message: 'Insert the Webhook URL of your Rewards Server',
      validate: (webhookUrl) => new RegExp(urlRegex).test(webhookUrl)
    },
    onCancel
  )

  if (cancelled) return null

  const { withRequestBody } = await prompts(
    {
      type: 'confirm',
      name: 'withRequestBody',
      message: 'Do you want to send a request body to your webhook?'
    },
    onCancel
  )

  if (cancelled) return null

  let reqBody: Record<string, string> = {}
  if (withRequestBody) {
    const { requestBody } = await prompts(
      {
        type: 'text',
        name: 'requestBody',
        message: 'Insert the request body to send within POST request to your webhook',
        validate: (body) => {
          try {
            JSON.parse(body)
            return true
          } catch (error) {
            return false
          }
        }
      },
      onCancel
    )

    if (cancelled) return null

    reqBody = JSON.parse(requestBody)
  }

  const { rewardItemsNumber } = await prompts(
    {
      type: 'number',
      name: 'rewardItemsNumber',
      message: 'How many items the user will receive?',
      validate: (num) => num > 0
    },
    onCancel
  )

  if (cancelled) return null

  const items = []

  for (let i = 1; i < rewardItemsNumber + 1; i++) {
    const { itemName } = await prompts(
      {
        type: 'text',
        name: 'itemName',
        message: `What is the name of your ${i} reward?`,
        validate: (name) => name.length >= 3
      },
      onCancel
    )

    if (cancelled) return null

    const { itemImage } = await prompts(
      {
        type: 'text',
        name: 'itemImage',
        message: `Provide an image link for your ${i} reward`,
        validate: (image) => new RegExp(urlRegex).test(image)
      },
      onCancel
    )

    if (cancelled) return null

    items.push({ name: itemName, imageLink: itemImage })
  }

  return {
    name: questName,
    description,
    imageUrl,
    definition,
    reward: {
      hook: {
        webhookUrl: webhookUrl,
        requestBody: Object.keys(reqBody).length >= 1 ? reqBody : undefined
      },
      items
    }
  }
}

const AUTH_CHAIN_HEADER_PREFIX = 'x-identity-auth-chain-'
const AUTH_TIMESTAMP_HEADER = 'x-identity-timestamp'
const AUTH_METADATA_HEADER = 'x-identity-metadata'

function createAuthchainHeaders(
  address: string,
  signature: string,
  payload: string,
  timestamp: string,
  metadata: string
): Record<string, string> {
  const authchain = Authenticator.createSimpleAuthChain(payload, address, signature)
  const headers: Record<string, string> = {}
  authchain.forEach((link, i) => {
    headers[AUTH_CHAIN_HEADER_PREFIX + i] = JSON.stringify(link)
  })
  headers[AUTH_TIMESTAMP_HEADER] = timestamp
  headers[AUTH_METADATA_HEADER] = metadata

  return headers
}

export const setUpManager = (components: Pick<CliComponents, 'fs' | 'logger' | 'fetch' | 'config'>) => {
  const { fs } = components
  const router = new Router()
  const questsManager = dirname(require.resolve('@dcl/quests-manager/package.json'))

  router.get('/', async () => {
    return {
      headers: { 'Content-Type': 'text/html' },
      body: fs.createReadStream(resolve(questsManager, 'index.html'))
    }
  })

  router.get('/design/create', async () => ({
    headers: { 'Content-Type': 'text/html' },
    body: fs.createReadStream(resolve(questsManager, 'index.html'))
  }))

  router.get('/quests/:id', async () => ({
    headers: { 'Content-Type': 'text/html' },
    body: fs.createReadStream(resolve(questsManager, 'index.html'))
  }))

  router.get('/quests/drafts/:id', async () => ({
    headers: { 'Content-Type': 'text/html' },
    body: fs.createReadStream(resolve(questsManager, 'index.html'))
  }))

  router.get('/quests/old/:id', async () => ({
    headers: { 'Content-Type': 'text/html' },
    body: fs.createReadStream(resolve(questsManager, 'index.html'))
  }))

  router.get('/:path*', async (ctx) => {
    return {
      body: fs.createReadStream(resolve(questsManager, ctx.params.path! as unknown as string))
    }
  })

  return { router }
}
