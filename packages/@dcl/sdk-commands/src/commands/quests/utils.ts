import { IFuture } from 'fp-future'
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
  messageToSign: string,
  linkOptions: LinkOptions,
  callback: (signature: LinkerResponse) => Promise<void>
): Promise<{ program?: Lifecycle.ComponentBasedProgram<unknown> }> {
  if (process.env.DCL_PRIVATE_KEY) {
    const wallet = createWallet(process.env.DCL_PRIVATE_KEY)
    const signature = ethSign(hexToBytes(wallet.privateKey), messageToSign)
    const linkerResponse = { signature, address: wallet.address }
    await callback(linkerResponse)
    awaitResponse.resolve()
    return {}
  }

  const { linkerPort, ...opts } = linkOptions
  const { program } = await runLinkerApp(components, awaitResponse, linkerPort!, messageToSign, opts, callback)

  return { program }
}

const url = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_\+.~#?&\/\/=]*)/gm

export const createQuest = async (_: Pick<CliComponents, 'logger'>): Promise<CreateQuest | null> => {
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

export function createAuthchainHeaders(
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
