import { resolve } from 'path'
import { ChainId } from '@dcl/schemas'
import { Authenticator } from '@dcl/crypto'
import { DeploymentBuilder } from 'dcl-catalyst-client'
import { EntityType } from 'dcl-catalyst-client/node_modules/@dcl/schemas'

import { CliComponents } from '../../components'
import { getBaseCoords, getFiles, getValidSceneJson, validateFilesSizes } from '../../logic/scene-validations'
import { declareArgs } from '../../logic/args'
import { npmRun } from '../../logic/project-validations'
import { CliError } from '../../logic/error'
import { printProgressInfo, printSuccess } from '../../logic/beautiful-logs'
import { getPackageJson, b64HashingFunction } from '../../logic/project-files'
import { Events } from '../../components/analytics'
import { Result } from 'arg'
import { getAddressAndSignature, getCatalyst, sceneHasWorldCfg } from './utils'

interface Options {
  args: Result<typeof args>
  components: CliComponents
}

export const args = declareArgs({
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
  '--port': Number,
  '-p': '--port'
})

export function help(options: Options) {
  options.components.logger.log(`
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
`)
}

export async function main(options: Options) {
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')
  const openBrowser = !options.args['--no-browser']
  const skipBuild = options.args['--skip-build']
  const linkerPort = options.args['--port']

  if (options.args['--target'] && options.args['--target-content']) {
    throw new CliError(`You can't set both the 'target' and 'target-content' arguments.`)
  }

  const sceneJson = await getValidSceneJson(options.components, projectRoot)
  const coords = getBaseCoords(sceneJson)
  const isWorld = sceneHasWorldCfg(sceneJson)
  const trackProps: Events['Scene deploy started'] = {
    projectHash: await b64HashingFunction(projectRoot),
    coords,
    isWorld
  }
  const packageJson = await getPackageJson(options.components, projectRoot)
  const dependencies = Array.from(
    new Set([...Object.keys(packageJson.dependencies || {}), ...Object.keys(packageJson.devDependencies || {})])
  )

  options.components.analytics.track('Scene deploy started', trackProps)

  if (!skipBuild) {
    await npmRun(options.components, projectRoot, 'build')
  }

  // Obtain list of files to deploy
  const files = await getFiles(options.components, projectRoot)

  validateFilesSizes(files)

  const contentFiles = new Map(files.map((file) => [file.path, file.content]))

  const { entityId, files: entityFiles } = await DeploymentBuilder.buildEntity({
    type: EntityType.SCENE,
    pointers: sceneJson.scene.parcels,
    files: contentFiles,
    metadata: sceneJson
  })

  // Signing message
  const messageToSign = entityId
  const { linkerResponse, program } = await getAddressAndSignature(
    options.components,
    messageToSign,
    sceneJson,
    files,
    {
      openBrowser,
      linkerPort,
      isHttps: !!options.args['--https'],
      skipValidations:
        !!options.args['--skip-validations'] || !!options.args['--target'] || !!options.args['--target-content']
    }
  )
  const { address, signature, chainId } = await linkerResponse
  const authChain = Authenticator.createSimpleAuthChain(entityId, address, signature)

  // Uploading data
  const catalyst = await getCatalyst(options.args['--target'], options.args['--target-content'])

  printProgressInfo(options.components.logger, `Uploading data to: ${catalyst.getContentUrl()}...`)

  const deployData = { entityId, files: entityFiles, authChain }
  const position = sceneJson.scene.base
  const network = chainId === ChainId.ETHEREUM_GOERLI ? 'goerli' : 'mainnet'
  const sceneUrl = `https://play.decentraland.org/?NETWORK=${network}&position=${position}`

  try {
    const response = (await catalyst.deploy(deployData, {
      timeout: '10m'
    })) as { message?: string }

    if (response.message) {
      printProgressInfo(options.components.logger, response.message)
    }
    printSuccess(options.components.logger, 'Content uploaded', sceneUrl)
  } catch (e: any) {
    options.components.logger.error('Could not upload content:')
    options.components.logger.error(e)
    options.components.analytics.track('Scene deploy failure', { ...trackProps, error: e.message ?? '' })
  } finally {
    await program?.stop()
  }
  options.components.analytics.track('Scene deploy success', {
    ...trackProps,
    sceneId: entityId,
    targetContentServer: catalyst.getContentUrl(),
    worldName: sceneJson.worldConfiguration?.name,
    isPortableExperience: !!sceneJson.isPortableExperience,
    dependencies
  })
}
