import { Scene } from '@dcl/schemas'
import { Lifecycle } from '@well-known-components/interfaces'
import { CatalystClient, ContentClient } from 'dcl-catalyst-client'
import { hexToBytes } from 'eth-connect'
import { ethSign } from '@dcl/crypto/dist/crypto'

import { CliComponents } from '../../components'
import { IFile } from '../../logic/scene-validations'
import { runLinkerApp, LinkerResponse } from './linker-dapp/api'
import { createWallet } from '../../logic/account'
import { IFuture } from 'fp-future'

export async function getCatalyst(target?: string, targetContent?: string) {
  if (target) {
    return new CatalystClient({ catalystUrl: target.endsWith('/') ? target.slice(0, -1) : target })
  }

  if (targetContent) {
    return new ContentClient({ contentUrl: targetContent })
  }

  return CatalystClient.connectedToCatalystIn({ network: 'mainnet' })
}

interface LinkOptions {
  openBrowser: boolean
  linkerPort?: number
  isHttps: boolean
  skipValidations: boolean
}

export async function getAddressAndSignature(
  components: CliComponents,
  awaitResponse: IFuture<void>,
  messageToSign: string,
  scene: Scene,
  files: IFile[],
  linkOptions: LinkOptions,
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

  const { linkerPort, ...opts } = linkOptions
  const { program } = await runLinkerApp(components, awaitResponse, scene, files, linkerPort!, messageToSign, opts, deployCallback)
  return { program }
}

export function sceneHasWorldCfg(scene: Scene) {
  return !!Object.keys(scene.worldConfiguration || {}).length
}
