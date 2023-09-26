import future, { IFuture } from 'fp-future'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { hexToBytes } from 'eth-connect'
import { Lifecycle } from '@well-known-components/interfaces'
import { Authenticator } from '@dcl/crypto'
import { dirname, resolve } from 'path'
import { Router } from '@well-known-components/http-server'
import prompts from 'prompts'

import { CreateQuest, QuestLinkerActionType, Step, Connection, Task, Action } from './types'
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

export function validateStep(step: Partial<Step>): boolean {
  if (!step?.id?.length) {
    throw new Error(`Step: ${JSON.stringify(step)} is missing an ID`)
  }

  if (!step?.description?.length) {
    throw new Error(`Step: ${step.id} is missing its description`)
  }

  if (!step.tasks?.length || !Array.isArray(step.tasks)) {
    throw new Error(`Step: ${step.id} contains invalid tasks`)
  }

  const ids = new Set()

  for (const task of step.tasks) {
    validateTask(task)

    if (ids.has(task.id)) {
      throw new Error(`${step.id} is repeated. Each Task's id must be unique`)
    } else {
      ids.add(task.id)
    }
  }

  return true
}

export function validateTask(task: Partial<Task>): boolean {
  if (!task?.id?.length) {
    throw new Error(`Task: ${JSON.stringify(task)} is missing an ID`)
  }

  if (!task?.description?.length) {
    throw new Error(`Task: ${task.id} is missing its description`)
  }

  if (!task?.actionItems?.length || !Array.isArray(task.actionItems)) {
    throw new Error(`Task: ${task.id} contains invalid action items`)
  }

  for (const at of task.actionItems) {
    validateActionItem(at)
  }

  return true
}

export function validateActionItem(action: Partial<Action>): boolean {
  switch (action.type) {
    case 'CUSTOM': {
      const keys = Object.keys(action.parameters || {})
      if (!keys.length) {
        throw new Error(`Custom Action must contain at least one parameter. eg: ID`)
      }
      return true
    }
    case 'LOCATION': {
      const keys = Object.keys(action.parameters || {})
      if (!keys.includes('X') || !keys.includes('Y')) {
        throw new Error(`Location Action must contain X and Y parameters`)
      }
      return true
    }
    case 'EMOTE': {
      const keys = Object.keys(action.parameters || {})
      if (!keys.includes('X') || !keys.includes('Y') || !keys.includes('id')) {
        throw new Error(`Emote Action must contain X, Y, and ID parameters`)
      }
      return true
    }
    case 'JUMP': {
      const keys = Object.keys(action.parameters || {})
      if (!keys.includes('X') || !keys.includes('Y')) {
        throw new Error(`Jump Action must contain X, Y, and ID parameters`)
      }
      return true
    }
    default:
      throw new Error(`Invalid Action: ${JSON.stringify(action)}`)
  }
}

export function validateStepsAndConnections(quest: Pick<CreateQuest, 'definition'>): boolean {
  if (!quest.definition) {
    throw new Error('Quest must have a definition')
  }

  validateConnections(quest.definition.connections || [])

  validateSteps(quest.definition.steps || [])

  return true
}

export function validateConnections(connections: Connection[]): boolean {
  if (!connections?.length || !Array.isArray(connections)) {
    throw new Error("Quest's definition must have its connections defined")
  }

  if (!connections.every((connection) => connection.stepFrom?.length && connection.stepTo?.length)) {
    throw new Error("Quest's definition must have valid connections")
  }

  if (!connections.every((connection) => connection.stepFrom !== connection.stepTo)) {
    throw new Error("Quest's connections are invalid. A Connection cannot go from and to the same step")
  }

  return true
}

export function validateSteps(steps: Step[]): boolean {
  if (!steps?.length || !Array.isArray(steps)) {
    throw new Error("Quest's definition must have its steps defined")
  }

  const ids = new Set()
  for (const step of steps) {
    validateStep(step)
    if (ids.has(step.id)) {
      throw new Error(`${step.id} is repeated. Each Step's id must be unique`)
    } else {
      ids.add(step.id)
    }
  }

  return true
}

export function validateCreateQuest(quest: CreateQuest): boolean {
  if (!quest.name || !(quest.name.length >= 5)) {
    throw new Error("Quest's name must be at least 5 chars")
  }

  if (!quest.description || !(quest.description.length >= 5)) {
    throw new Error("Quest's description must be at least 5 chars")
  }

  if (!quest.imageUrl?.length || !new RegExp(urlRegex).test(quest.imageUrl)) {
    throw new Error("Quest's image URL must be a valid URL")
  }

  validateStepsAndConnections(quest)

  if (quest.reward) {
    if (!quest.reward.hook) {
      throw new Error("Quest's reward must have its webhook defined")
    } else {
      if (
        !quest.reward.hook.webhookUrl ||
        !quest.reward.hook.webhookUrl?.length ||
        !new RegExp(urlRegex).test(quest.reward.hook.webhookUrl)
      ) {
        throw new Error("Quest's reward must have a valid Webhook URL")
      }
    }

    if (!quest.reward.items || !quest.reward.items?.length || !Array.isArray(quest.reward.items)) {
      throw new Error("Quest's reward must have its items defined")
    }

    if (
      !quest.reward.items.every(
        (item) => new RegExp(urlRegex).test(item.imageLink || '') && item?.name && item.name?.length >= 3
      )
    ) {
      throw new Error("Quest's reward must have valid items")
    }
  }

  return true
}
