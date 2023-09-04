import future, { IFuture } from 'fp-future'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { hexToBytes } from 'eth-connect'
import { Lifecycle } from '@well-known-components/interfaces'
import { Authenticator } from '@dcl/crypto'
import prompts from 'prompts'

import { CreateQuest, QuestLinkerActionType } from './types'
import { CliComponents } from '../../components'
import { createWallet } from '../../logic/account'
import { LinkerResponse, LinkerdAppOptions, runLinkerApp } from '../../linker-dapp/api'
import { setRoutes } from '../../linker-dapp/routes'
import { CliError } from '../../logic/error'

async function getAddressAndSignature(
  components: CliComponents,
  linkerOpts: Omit<LinkerdAppOptions, 'uri'>,
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

  const { program } = await runLinkerApp(components, router, { ...linkerOpts, uri: `/quests` })

  return { program }
}

export async function executeSubcommand(
  components: CliComponents,
  linkerOps: Omit<LinkerdAppOptions, 'uri'>,
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

function validateStepsAndConnections(
  quest: Pick<CreateQuest, 'definition'>,
  _components: Pick<CliComponents, 'logger'>
): boolean {
  if (!quest.definition) {
    throw new CliError('> Quest must have a definition')
  }

  if (!quest.definition.connections?.length || !Array.isArray(quest.definition.connections)) {
    throw new CliError("> Quest's definition must have its connections defined")
  }

  if (!quest.definition.connections.every((connection) => connection.stepFrom?.length && connection.stepTo?.length)) {
    throw new CliError("> Quest's definition must have valid connections")
  }

  if (!quest.definition.steps?.length || !Array.isArray(quest.definition.steps)) {
    throw new CliError("> Quest's definition must have its steps defined")
  }

  if (
    !quest.definition.steps.every(
      (step) =>
        step.tasks?.length &&
        Array.isArray(step.tasks) &&
        step.tasks?.every(
          (task) =>
            task.actionItems?.length &&
            Array.isArray(task.actionItems) &&
            task.actionItems?.every(
              (at) =>
                (at.type === 'CUSTOM' || at.type === 'LOCATION' || at.type === 'EMOTE' || at.type === 'JUMP') &&
                Object.keys(at.parameters || {}).length >= 1
            ) &&
            task.description?.length >= 0 &&
            task.id?.length
        ) &&
        step.id?.length &&
        step.description?.length >= 0
    )
  ) {
    throw new CliError("> Quest definition's steps must be valid")
  }

  return true
}

export function validateCreateQuest(quest: CreateQuest, components: Pick<CliComponents, 'logger'>): boolean {
  if (!(quest.name.length >= 5)) {
    throw new CliError("> Quest's name must be at least 5 chars")
  }

  if (!(quest.description.length >= 5)) {
    throw new CliError("> Quest's description must be at least 5 chars")
  }

  if (!quest.imageUrl?.length || !new RegExp(urlRegex).test(quest.imageUrl)) {
    throw new CliError("> Quest's image URL must be a valid URL")
  }

  validateStepsAndConnections(quest, components)

  if (quest.reward) {
    if (!quest.reward.hook) {
      throw new CliError("> Quest's reward must have its webhook defined")
    } else {
      if (
        !quest.reward.hook.webhookUrl ||
        !quest.reward.hook.webhookUrl?.length ||
        !new RegExp(urlRegex).test(quest.reward.hook.webhookUrl)
      ) {
        throw new CliError("> Quest's reward must have a valid Webhook URL")
      }
    }

    if (!quest.reward.items || !quest.reward.items?.length || !Array.isArray(quest.reward.items)) {
      throw new CliError("> Quest's reward must have its items defined")
    }

    if (
      !quest.reward.items.every((item) => new RegExp(urlRegex).test(item.imageLink || '') && item.name?.length >= 3)
    ) {
      throw new CliError("> Quest's reward must have valid items")
    }
  }

  return true
}

export const createQuestByPrompting = async (
  components: Pick<CliComponents, 'logger'>
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
          if (validateStepsAndConnections({ definition: input }, { logger: components.logger })) {
            return true
          }
          return false
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
