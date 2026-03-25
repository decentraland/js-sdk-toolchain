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

  const headers: Record<string, string> = {
    'x-identity-timestamp': timestamp,
    'x-identity-metadata': metadata
  }
  authChain.forEach((link, i) => {
    headers[`x-identity-auth-chain-${i}`] = JSON.stringify(link)
  })

  const response = await fetch(deleteUrl, { method: 'DELETE', headers })
  logger.info(`[DELETE] deleting world scenes status=${response.status}`)
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
  deleteScenesFromWorldPayload?: string,
  targetContent?: string,
  multiScene?: boolean
): Promise<{ program?: Lifecycle.ComponentBasedProgram<unknown> }> {
  if (process.env.DCL_PRIVATE_KEY) {
    const wallet = createWallet(process.env.DCL_PRIVATE_KEY)
    const authChain = Authenticator.createSimpleAuthChain(
      messageToSign,
      wallet.address,
      ethSign(hexToBytes(wallet.privateKey), messageToSign)
    )
    let deleteSignature: string | undefined
    if (deleteScenesFromWorldPayload) {
      const deleteAuthChain = Authenticator.createSimpleAuthChain(
        deleteScenesFromWorldPayload,
        wallet.address,
        ethSign(hexToBytes(wallet.privateKey), deleteScenesFromWorldPayload)
      )
      deleteSignature = JSON.stringify(deleteAuthChain)
    }
    const linkerResponse: LinkerResponse = { authChain, address: wallet.address, deleteSignature }
    await deployCallback(linkerResponse)
    awaitResponse.resolve()
    return {}
  }

  const sceneInfo = await getSceneInfo(
    components,
    scene,
    messageToSign,
    skipValidations,
    deleteScenesFromWorldPayload,
    targetContent,
    multiScene
  )
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

  router.get('/api/world-parcel-permissions/:address', async (ctx) => {
    if (!sceneInfo.isWorld || !sceneInfo.world || !sceneInfo.targetContent) {
      return { status: 400, body: { message: 'Not a world deployment or missing targetContent' } }
    }
    try {
      const address = ctx.params.address
      const permissions = await fetchWorldPermissions(sceneInfo.world, sceneInfo.targetContent)
      const lowerAddress = address.toLowerCase()

      const allGranted = sceneInfo.parcels.map((p) => {
        const [x, y] = p.split(',')
        return { x: parseInt(x, 10), y: parseInt(y, 10), isUpdateAuthorized: true }
      })

      if (permissions.owner?.toLowerCase() === lowerAddress) {
        return { body: { authorizations: allGranted, worldWidePermission: true } }
      }

      const walletSummary = permissions.summary?.[lowerAddress]
      const deploymentSummary = walletSummary?.find((s) => s.permission === 'deployment')
      const hasWorldWide = deploymentSummary?.world_wide ?? false

      if (hasWorldWide) {
        return { body: { authorizations: allGranted, worldWidePermission: true } }
      }

      const allowedParcels = await fetchParcelPermissions(sceneInfo.world, address, sceneInfo.targetContent)
      const allowedSet = new Set(allowedParcels)

      return {
        body: {
          authorizations: sceneInfo.parcels.map((p) => {
            const [x, y] = p.split(',')
            return { x: parseInt(x, 10), y: parseInt(y, 10), isUpdateAuthorized: allowedSet.has(p) }
          }),
          worldWidePermission: false
        }
      }
    } catch (e) {
      logger.error(`Error fetching world parcel permissions: ${(e as Error).message}`)
      return { status: 500, body: { message: (e as Error).message } }
    }
  })

  router.post('/api/deploy', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse
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
  targetContent?: string
  multiScene?: boolean
}

export async function getSceneInfo(
  components: Pick<CliComponents, 'config'>,
  scene: Scene,
  rootCID: string,
  skipValidations: boolean,
  deleteScenesFromWorldPayload?: string,
  targetContent?: string,
  multiScene?: boolean
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
    deleteScenesFromWorldPayload,
    targetContent,
    multiScene
  }
}

export interface WorldScene {
  entityId: string
  parcels?: string[]
  entity?: { metadata?: { display?: { title?: string } } }
}

export function getScenesOnOtherParcels(existingScenes: WorldScene[], deployingParcels: string[]): WorldScene[] {
  const parcelsSet = new Set(deployingParcels)
  return existingScenes.filter((scene) => {
    const sceneParcels = scene.parcels || []
    return sceneParcels.every((p) => !parcelsSet.has(p))
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
  const response = await fetch(url)
  if (!response.ok) {
    const text = await response.text()
    logger.info(`[DEPLOY] fetching scenes from world -  error: ${text}`)
    throw new Error(`Failed to fetch world scenes: ${response.status} ${response.statusText}`)
  }
  const data = (await response.json()) as WorldScenesResponse
  logger.info(`[DEPLOY] fetching scenes from world success: total=${data.total}, scenes=${data.scenes?.length}`)
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

export async function validateWorldExists(worldName: string, targetContent: string): Promise<boolean> {
  const encodedName = encodeURIComponent(worldName)
  const url = `${targetContent}/world/${encodedName}/about`
  const response = await fetch(url)
  return response.ok
}

interface WorldPermissionsResponse {
  permissions: {
    deployment: {
      type: string
      wallets: string[]
    }
  }
  owner?: string
  summary?: Record<string, { permission: string; world_wide: boolean; parcel_count: number }[]>
}

export async function fetchWorldPermissions(
  worldName: string,
  targetContent: string
): Promise<WorldPermissionsResponse> {
  const encodedName = encodeURIComponent(worldName)
  const url = `${targetContent}/world/${encodedName}/permissions`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch world permissions: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as WorldPermissionsResponse
}

export async function fetchParcelPermissions(
  worldName: string,
  address: string,
  targetContent: string
): Promise<string[]> {
  const encodedName = encodeURIComponent(worldName)
  const url = `${targetContent}/world/${encodedName}/permissions/deployment/address/${address.toLowerCase()}/parcels`
  console.log(`[DEPLOY] Fetching parcel permissions from: ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch parcel permissions: ${response.status} ${response.statusText}`)
  }
  const data = (await response.json()) as { parcels: string[] }
  return data.parcels || []
}

export async function checkWorldDeploymentPermission(
  logger: { info: (msg: string) => void },
  worldName: string,
  address: string,
  targetContent: string,
  deployingParcels: string[]
): Promise<{ allowed: boolean; deniedParcels?: string[] }> {
  const permissions = await fetchWorldPermissions(worldName, targetContent)
  const lowerAddress = address.toLowerCase()

  logger.info(`[DEPLOY] Permissions response for "${worldName}": ${JSON.stringify(permissions)}`)

  // Check if wallet is the world owner
  if (permissions.owner?.toLowerCase() === lowerAddress) {
    return { allowed: true }
  }

  // Check world-wide deployment permission
  const deploymentPermission = permissions.permissions?.deployment
  if (deploymentPermission) {
    if (deploymentPermission.type === 'unrestricted') {
      return { allowed: true }
    }
    const allowedWallets = (deploymentPermission.wallets || []).map((w: string) => w.toLowerCase())
    if (allowedWallets.includes(lowerAddress)) {
      // Check if wallet has world-wide permission or only per-parcel
      const walletSummary = permissions.summary?.[lowerAddress]
      const deploymentSummary = walletSummary?.find((s) => s.permission === 'deployment')
      if (!deploymentSummary || deploymentSummary.world_wide) {
        return { allowed: true }
      }
      // Wallet is in allow-list but only has per-parcel permissions, fall through to parcel check
    }
  }

  // Check per-parcel permissions
  const allowedParcels = await fetchParcelPermissions(worldName, address, targetContent)
  logger.info(`[DEPLOY] Allowed parcels for ${address}: ${JSON.stringify(allowedParcels)}`)
  const allowedSet = new Set(allowedParcels)
  const deniedParcels = deployingParcels.filter((p) => !allowedSet.has(p))

  if (deniedParcels.length === 0) {
    return { allowed: true }
  }

  return { allowed: false, deniedParcels }
}
