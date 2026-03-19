import * as readline from 'readline'
import { ChainId, Scene } from '@dcl/schemas'
import { AuthChain } from '@dcl/crypto'
import { Lifecycle } from '@well-known-components/interfaces'
import { createCatalystClient, createContentClient, CatalystClient, ContentClient } from 'dcl-catalyst-client'
import { getCatalystServersFromCache } from 'dcl-catalyst-client/dist/contracts-snapshots'
import { createFetchComponent } from '@well-known-components/fetch-component'
import { hexToBytes } from 'eth-connect'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { Authenticator } from '@dcl/crypto'

import { CliComponents } from '../../components'
import { IFile } from '../../logic/scene-validations'
import { LinkerResponse } from '../../linker-dapp/routes'
import { setRoutes } from '../../linker-dapp/routes'
import { createWallet } from '../../logic/account'
import { IFuture } from 'fp-future'
import { getEstateRegistry, getLandRegistry } from '../../logic/config'
import { getObject } from '../../logic/coordinates'
import { getPointers } from '../../logic/catalyst-requests'
import { Router } from '@well-known-components/http-server'
import { dAppOptions, runDapp } from '../../run-dapp'

export async function getCatalyst(
  chainId: ChainId = ChainId.ETHEREUM_MAINNET,
  target?: string,
  targetContent?: string
): Promise<{ client: ContentClient; url: string }> {
  if (target) {
    const catalyst = createCatalystClient({
      url: target.endsWith('/') ? target.slice(0, -1) : target,
      fetcher: createFetchComponent()
    })

    const content = await catalyst.getContentClient()
    const {
      lambdas: { publicUrl }
    } = await catalyst.fetchAbout()

    return { client: content, url: publicUrl }
  }

  if (targetContent) {
    return { client: createContentClient({ url: targetContent, fetcher: createFetchComponent() }), url: targetContent }
  }

  let catalystClient: CatalystClient

  if (chainId === ChainId.ETHEREUM_SEPOLIA) {
    catalystClient = createCatalystClient({ url: 'peer.decentraland.zone', fetcher: createFetchComponent() })
  } else {
    const catalysts = getCatalystServersFromCache('mainnet')

    for (const catalyst of catalysts) {
      const client = createCatalystClient({ url: catalyst.address, fetcher: createFetchComponent() })

      const isHealthy = (await client.fetchAbout()).healthy

      if (isHealthy) {
        catalystClient = client
        break
      }
    }
  }

  return {
    client: await catalystClient!.getContentClient(),
    url: (await catalystClient!.fetchAbout()).lambdas.publicUrl
  }
}

export function buildDeleteScenesFromWorldPayload(worldName: string): string {
  const encodedName = encodeURIComponent(worldName)
  const path = `/entities/${encodedName}`
  const timestamp = String(Date.now())
  const metadata = '{}'
  return ['delete', path, timestamp, metadata].join(':').toLowerCase()
}

export async function deleteWorldScenes(
  components: Pick<CliComponents, 'logger'>,
  worldName: string,
  deleteSignature: string,
  targetContent?: string
): Promise<Response> {
  const { logger } = components

  const encodedName = encodeURIComponent(worldName)
  const deleteUrl = `${targetContent}/entities/${encodedName}`

  const authChain: AuthChain = JSON.parse(deleteSignature)
  const lastLink = authChain[authChain.length - 1]
  const payloadParts = lastLink.payload.split(':')
  const timestamp = payloadParts[2] || String(Date.now())
  const metadata = payloadParts[3] || '{}'

  logger.info(`[DEBUG deleteWorldScenes] DELETE ${deleteUrl}`)

  const headers: Record<string, string> = {
    'x-identity-timestamp': timestamp,
    'x-identity-metadata': metadata
  }
  authChain.forEach((link, i) => {
    headers[`x-identity-auth-chain-${i}`] = JSON.stringify(link)
  })

  logger.info(`[DEBUG deleteWorldScenes] sending DELETE request...`)
  const response = await fetch(deleteUrl, { method: 'DELETE', headers })
  logger.info(`[DEBUG deleteWorldScenes] response status=${response.status}`)
  return response
}

export async function getAddressAndSignature(
  components: CliComponents,
  awaitResponse: IFuture<void>,
  messageToSign: string,
  scene: Scene,
  files: IFile[],
  skipValidations: boolean,
  linkOptions: Omit<dAppOptions, 'uri'>,
  deployCallback: (response: LinkerResponse) => Promise<void>,
  deleteScenesFromWorldPayload?: string
): Promise<{ program?: Lifecycle.ComponentBasedProgram<unknown> }> {
  if (process.env.DCL_PRIVATE_KEY) {
    const wallet = createWallet(process.env.DCL_PRIVATE_KEY)
    const authChain = Authenticator.createSimpleAuthChain(
      messageToSign,
      wallet.address,
      ethSign(hexToBytes(wallet.privateKey), messageToSign)
    )
    const linkerResponse: LinkerResponse = { authChain, address: wallet.address }
    await deployCallback(linkerResponse)
    awaitResponse.resolve()
    return {}
  }

  const sceneInfo = await getSceneInfo(components, scene, messageToSign, skipValidations, deleteScenesFromWorldPayload)
  components.logger.info(`[DEBUG getAddressAndSignature] browser flow, opening linker-dapp`)
  const { router: commonRouter } = setRoutes(components, sceneInfo)
  const router = setDeployRoutes(commonRouter, components, awaitResponse, sceneInfo, files, deployCallback)

  components.logger.info('You need to sign the content before the deployment:')
  const { program } = await runDapp(components, router, { ...linkOptions, uri: `/` })
  return { program }
}

function setDeployRoutes(
  router: Router<object>,
  components: CliComponents,
  awaitResponse: IFuture<void>,
  sceneInfo: SceneInfo,
  files: IFile[],
  deployCallback: (response: LinkerResponse) => Promise<void>
): Router<object> {
  const { logger } = components

  const resolveLinkerPromise = () => setTimeout(() => awaitResponse.resolve(), 100)
  const rejectLinkerPromise = (e: Error) => setTimeout(() => awaitResponse.reject(e), 100)
  let linkerResponse: LinkerResponse

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
    const network = chainId === ChainId.ETHEREUM_MAINNET ? 'mainnet' : 'sepolia'
    const value = await getPointers(components, pointer, network)
    const deployedToAll = new Set(value.map((c) => c.entityId)).size === 1

    if (deployedToAll) resolveLinkerPromise()

    return {
      body: { catalysts: value }
    }
  })

  router.post('/api/deploy', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    logger.info(`[DEBUG /api/deploy] received from linker-dapp:`)
    logger.info(`[DEBUG /api/deploy]   address=${value.address}`)
    logger.info(`[DEBUG /api/deploy]   chainId=${value.chainId}`)

    if (!value.address || !value.authChain || !value.chainId) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      logger.error(errorMessage)
      resolveLinkerPromise()
      return { status: 400, body: { message: errorMessage } }
    }

    linkerResponse = value

    try {
      await deployCallback(value)
      if (sceneInfo.isWorld) {
        resolveLinkerPromise()
      }
      return {}
    } catch (e) {
      rejectLinkerPromise(e as Error)
      return { status: 400, body: { message: (e as Error).message } }
    }
  })

  return router
}

export function sceneHasWorldCfg(scene: Scene) {
  return !!Object.keys(scene.worldConfiguration || {}).length
}

export interface SceneInfo {
  baseParcel: string
  parcels: string[]
  rootCID: string
  landRegistry?: string
  estateRegistry?: string
  debug: boolean
  title?: string
  description?: string
  skipValidations: boolean
  isPortableExperience: boolean
  isWorld: boolean
  world?: string
  deleteScenesFromWorldPayload?: string
}

export async function getSceneInfo(
  components: Pick<CliComponents, 'config'>,
  scene: Scene,
  rootCID: string,
  skipValidations: boolean,
  deleteScenesFromWorldPayload?: string
) {
  const {
    scene: { parcels, base },
    display,
    isPortableExperience
  } = scene

  return {
    baseParcel: base,
    parcels,
    rootCID,
    landRegistry: await getLandRegistry(components),
    estateRegistry: await getEstateRegistry(components),
    debug: !!process.env.DEBUG,
    title: display?.title,
    description: display?.description,
    skipValidations,
    isPortableExperience: !!isPortableExperience,
    isWorld: sceneHasWorldCfg(scene),
    world: scene.worldConfiguration?.name,
    deleteScenesFromWorldPayload
  }
}

export interface WorldScene {
  entityId: string
  parcels?: string[]
  entity?: { metadata?: { display?: { title?: string } } }
}

/**
 * Returns scenes that have parcels NOT included in the deploying parcels.
 * If all existing scenes are on the same parcels being deployed, returns empty (no delete needed).
 */
export function getScenesOnOtherParcels(existingScenes: WorldScene[], deployingParcels: string[]): WorldScene[] {
  const parcelsSet = new Set(deployingParcels)
  return existingScenes.filter((scene) => {
    const sceneParcels = scene.parcels || []
    return sceneParcels.some((p) => !parcelsSet.has(p))
  })
}

interface WorldScenesResponse {
  scenes: WorldScene[]
  total: number
}

export async function fetchWorldScenes(
  logger: { info: (msg: string) => void },
  worldName: string,
  targetContent?: string
): Promise<WorldScene[]> {
  const encodedName = encodeURIComponent(worldName)
  const url = `${targetContent}/world/${encodedName}/scenes`
  logger.info(`[DEBUG fetchWorldScenes] GET ${url}`)
  const response = await fetch(url)
  logger.info(`[DEBUG fetchWorldScenes] response status=${response.status}`)
  if (!response.ok) {
    const text = await response.text()
    logger.info(`[DEBUG fetchWorldScenes] error body: ${text}`)
    throw new Error(`Failed to fetch world scenes: ${response.status} ${response.statusText}`)
  }
  const data = (await response.json()) as WorldScenesResponse
  logger.info(`[DEBUG fetchWorldScenes] response: total=${data.total}, scenes=${data.scenes?.length}`)
  return data.scenes || []
}

export function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}
