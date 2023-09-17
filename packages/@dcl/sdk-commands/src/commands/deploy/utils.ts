import { ChainId, Scene } from '@dcl/schemas'
import { Lifecycle } from '@well-known-components/interfaces'
import { createCatalystClient, createContentClient, CatalystClient, ContentClient } from 'dcl-catalyst-client'
import { getCatalystServersFromCache } from 'dcl-catalyst-client/dist/contracts-snapshots'
import { createFetchComponent } from '@well-known-components/fetch-component'
import { hexToBytes } from 'eth-connect'
import { ethSign } from '@dcl/crypto/dist/crypto'

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

export async function getAddressAndSignature(
  components: CliComponents,
  awaitResponse: IFuture<void>,
  messageToSign: string,
  scene: Scene,
  files: IFile[],
  skipValidations: boolean,
  linkOptions: Omit<dAppOptions, 'uri'>,
  deployCallback: (response: LinkerResponse) => Promise<void>
): Promise<{ program?: Lifecycle.ComponentBasedProgram<unknown> }> {
  if (process.env.DCL_PRIVATE_KEY) {
    const wallet = createWallet(process.env.DCL_PRIVATE_KEY)
    const signature = ethSign(hexToBytes(wallet.privateKey), messageToSign)
    const linkerResponse = { signature, address: wallet.address }
    await deployCallback(linkerResponse)
    awaitResponse.resolve()
    return {}
  }

  const sceneInfo = await getSceneInfo(components, scene, messageToSign, skipValidations)
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

  // We need to wait so the linker-dapp can receive the response and show a nice message.
  const resolveLinkerPromise = () => setTimeout(() => awaitResponse.resolve(), 100)
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
      return { status: 400, body: { message: errorMessage } }
    }

    // Store the chainId so we can use it on the catalyst pointers.
    linkerResponse = value

    try {
      await deployCallback(value)
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
}

export async function getSceneInfo(
  components: Pick<CliComponents, 'config'>,
  scene: Scene,
  rootCID: string,
  skipValidations: boolean
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
    isWorld: sceneHasWorldCfg(scene)
  }
}
