import future, { IFuture } from 'fp-future'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { hexToBytes } from 'eth-connect'
import { Lifecycle } from '@well-known-components/interfaces'
import { CliComponents } from '../../components'
import { createWallet } from '../../logic/account'
import { LinkerResponse, runLinkerApp } from './linker-dapp/api'
import { CreateQuest } from './types'
import prompts from 'prompts'
import { Authenticator } from '@dcl/crypto'

interface LinkOptions {
  openBrowser: boolean
  linkerPort?: number
  isHttps: boolean
}

export async function getAddressAndSignature(
  components: CliComponents,
  awaitResponse: IFuture<void>,
  info: { messageToSign: string; extraData?: { questName?: string; questId?: string; createQuest?: CreateQuest } },
  actionType: 'create' | 'list' | 'activate' | 'deactivate',
  linkOptions: LinkOptions,
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

  const { linkerPort, ...opts } = linkOptions
  const { program } = await runLinkerApp(components, awaitResponse, linkerPort!, info, actionType, opts, callback)

  return { program }
}

const url = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_\+.~#?&\/\/=]*)/gm

export function validateCreateQuest(quest: CreateQuest, components: Pick<CliComponents, 'logger'>): boolean {
  const { logger } = components

  if (!(quest.name.length >= 5)) {
    logger.error("> Quest's name must be at least 5 chars")
    return false
  }

  if (!(quest.description.length >= 5)) {
    logger.error("> Quest's description must be at least 5 chars")
    return false
  }

  if (!quest.imageUrl.length || !new RegExp(url).test(quest.imageUrl)) {
    logger.error("> Quest's image URL must be a valid URL")
    return false
  }

  if (!quest.definition.connections.length) {
    logger.error("> Quest's definition must have its connections defined")
    return false
  }

  if (!quest.definition.connections.every((connection) => connection.stepFrom.length && connection.stepTo.length)) {
    logger.error("> Quest's definition must have valid connections")
    return false
  }

  if (!quest.definition.steps.length) {
    logger.error("> Quest's definition must have its steps defined")
    return false
  }

  if (
    !quest.definition.steps.every(
      (step) =>
        step.tasks.length &&
        step.tasks.every(
          (task) =>
            task.actionItems.length &&
            task.actionItems.every(
              (at) =>
                (at.type === 'CUSTOM' || at.type === 'LOCATION' || at.type === 'EMOTE' || at.type === 'JUMP') &&
                Object.keys(at.parameters).length === (2 || 3)
            ) &&
            task.description?.length >= 0 &&
            task.id.length
        ) &&
        step.id.length &&
        step.description?.length >= 0
    )
  ) {
    logger.error("> Quest definition's steps must be valid")
    return false
  }

  if (quest.reward) {
    if (!quest.reward.hook) {
      logger.error("> Quest's reward must have its webhook defined")
      return false
    } else {
      if (!quest.reward.hook.webhookUrl || !new RegExp(url).test(quest.reward.hook.webhookUrl)) {
        logger.error("> Quest's reward must have a valid Webhook URL")
        return false
      }
    }

    if (!quest.reward.items || !quest.reward.items.length) {
      logger.error("> Quest's reward muat have its items defined")
      return false
    }

    if (!quest.reward.items.every((item) => new RegExp(url).test(item.imageLink || '') && item.name?.length >= 3)) {
      logger.error("> Quest's reward muat have valid items")
      return false
    }
  }

  return true
}

export const createQuest = async (_components: Pick<CliComponents, 'logger'>): Promise<CreateQuest | null> => {
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
      validate: (imageUrl) => new RegExp(url).test(imageUrl)
    },
    onCancel
  )

  let { definition } = await prompts(
    {
      type: 'text',
      name: 'definition',
      message: 'Paste the Defintion (Steps & Connections) of your Quest',
      validate: (def) => {
        const input = JSON.parse(def)
        if (input.connections.length && input.steps.length) {
          return true
        }
        return false
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
      validate: (webhookUrl) => new RegExp(url).test(webhookUrl)
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
        validate: (image) => new RegExp(url).test(image)
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

export async function executeSubcommand(
  components: CliComponents,
  commandData: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    metadata: Record<any, any>
    actionType: 'create' | 'list' | 'activate' | 'deactivate'
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
    awaitResponse,
    { messageToSign: payload, extraData: commandData.extraData },
    commandData.actionType,
    {
      isHttps: false,
      openBrowser: false,
      linkerPort: 3003
    },
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
