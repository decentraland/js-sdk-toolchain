import { resolve } from 'path'
import { getChainName, EntityType, ChainId, Scene } from '@dcl/schemas'
import { CatalystClient, ContentClient, DeploymentBuilder } from 'dcl-catalyst-client'
import { Authenticator } from '@dcl/crypto'
import open from 'open'

import { CliComponents } from '../../components'
import { main as build } from '../build'
import { getSceneFile } from '../preview/project'
import { getArgs } from '../../utils/args'
import { npmRun } from '../build/helpers'
import { IFile, getFiles, validateScene } from '../../utils/scene'
import { getDCLIgnorePatterns } from '../../utils/dcl-ignore'
import { fail, info, succeed } from '../../utils/log'
import { LinkerAPI, LinkerResponse } from './linker-dapp/api'

interface Options {
  args: typeof args
  components: Pick<CliComponents, 'fetch' | 'fs'>
}

export const args = getArgs({
  '--dir': String,
  '--help': Boolean,
  '-h': '--help',
  '--target': String,
  '-t': '--target',
  '--target-content': String,
  '-tc': '--target-content',
  '--skip-validations': Boolean,
  '--skip-version-checks': Boolean,
  '--skip-build': Boolean,
  '--https': Boolean,
  '--force-upload': Boolean,
  '--yes': Boolean,
  '--no-browser': Boolean,
  '-b': '--no-browser',
  '--port': String,
  '-p': '--port'
})

export function help() {
  return `
  Usage: 'sdk-commands build [options]'
    Options:
      -h, --help                Displays complete help
      -p, --port        [port]  Select a custom port for the development server
      -t, --target              Specifies the address and port for the target catalyst server. Defaults to peer.decentraland.org
      -t, --target-content      Specifies the address and port for the target content server. Example: 'peer.decentraland.org/content'. Can't be set together with --target
      -b, --no-browser          Do not open a new browser window
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-build              Skip build before deploy
      --skip-validations        Skip permissions verifications on the client side when deploying content

    Example:
    - Deploy your scene:
      $ sdk-commands deploy
    - Deploy your scene to a specific content server:
      $ sdk-commands deploy --target my-favorite-catalyst-server.org:2323
`
}

export async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  const openBrowser = !options.args['--no-browser']
  const skipBuild = options.args['--skip-build']
  const port = options.args['--port']
  const parsedPort = typeof port === 'string' ? parseInt(port, 10) : void 0
  const linkerPort = parsedPort && Number.isInteger(parsedPort) ? parsedPort : void 0

  const comps = { components: options.components }

  if (!skipBuild) {
    await npmRun(dir, 'build')
  }

  await build({ args: { '--dir': dir }, ...comps })

  if (options.args['--target'] && options.args['--target-content']) {
    throw new Error(`You can't set both the 'target' and 'target-content' arguments.`)
  }

  // Obtain list of files to deploy
  const ignoreFiles = (await getDCLIgnorePatterns(options.components, dir)).concat('entity.json')
  const files = await getFiles({ dir, ignoreFiles })
  const contentFiles = new Map(files.map((file) => [file.path, file.content]))
  const sceneJson = await getSceneFile(options.components, dir)

  const { entityId, files: entityFiles } = await DeploymentBuilder.buildEntity({
    type: EntityType.SCENE,
    pointers: sceneJson.scene.parcels,
    files: contentFiles,
    metadata: sceneJson
  })

  validateScene(sceneJson, true)

  // Signing message
  const messageToSign = entityId
  const { signature, address, chainId } = await getAddressAndSignature(dir, messageToSign, sceneJson, files, {
    openBrowser,
    linkerPort,
    isHttps: !!options.args['--https'],
    skipValidations:
      !!options.args['--skip-validations'] || !!options.args['--target'] || !!options.args['--target-content']
  })
  const authChain = Authenticator.createSimpleAuthChain(entityId, address, signature)

  // Uploading data
  const catalyst = await getCatalyst(options.args['--target'], options.args['--target-content'])

  info(`Uploading data to: ${catalyst.getContentUrl()}...`)

  const deployData = { entityId, files: entityFiles, authChain }
  const position = sceneJson.scene.base
  const network = chainId === ChainId.ETHEREUM_GOERLI ? 'goerli' : 'mainnet'
  const sceneUrl = `https://play.decentraland.org/?NETWORK=${network}&position=${position}`

  try {
    const response = (await catalyst.deploy(deployData, {
      timeout: '10m'
    })) as { message?: string }

    succeed(`Content uploaded. ${sceneUrl}\n`)

    if (response.message) {
      console.log(response.message)
    }
  } catch (error: any) {
    fail('Could not upload content:')
    console.log(error)
  }
}

const getCatalyst = async (target?: string, targetContent?: string) => {
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

const link = (
  dir: string,
  rootCID: string,
  scene: Scene,
  files: IFile[],
  { openBrowser, linkerPort, isHttps, skipValidations }: LinkOptions
): Promise<LinkerResponse> => {
  return new Promise<LinkerResponse>(async (resolve, reject) => {
    const linker = new LinkerAPI(scene, files)

    linker.on('link:ready', ({ url, params }) => {
      info('You need to sign the content before the deployment:')

      if (openBrowser) {
        setTimeout(async () => {
          try {
            await open(`${url}?${params}`)
          } catch (e) {
            fail(`Unable to open browser automatically`)
          }
        }, 5000)
      }

      info(`Signing app ready at ${url}`)
    })

    linker.on('link:success', async (message: LinkerResponse) => {
      const { address, signature, chainId } = message
      succeed(`Content successfully signed.`)
      info(`Address: ${address}`)
      info(`Signature: ${signature}`)
      info(`Network: ${getChainName(chainId!)}`)
      resolve(message)
    })

    try {
      await linker.link(dir, linkerPort!, isHttps, rootCID, skipValidations)
    } catch (e) {
      reject(e)
    }
  })
}

const getAddressAndSignature = (
  dir: string,
  messageToSign: string,
  scene: Scene,
  files: IFile[],
  linkOptions: LinkOptions
): Promise<LinkerResponse> => {
  // if (this.environmentIdentity) {
  //   return {
  //     signature: ethSign(
  //       hexToBytes(this.environmentIdentity.privateKey),
  //       messageToSign
  //     ),
  //     address: this.environmentIdentity.address
  //   }
  // }

  return link(dir, messageToSign, scene, files, linkOptions)
}
