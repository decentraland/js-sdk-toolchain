import { resolve } from 'path'
import { EntityType, ChainId, getChainName } from '@dcl/schemas'
import { DeploymentBuilder } from 'dcl-catalyst-client'
import future from 'fp-future'
import i18next from 'i18next'

import { CliComponents } from '../../components'
import { getBaseCoords, getFiles, getValidSceneJson, validateFilesSizes } from '../../logic/scene-validations'
import { declareArgs } from '../../logic/args'
import { CliError } from '../../logic/error'
import { printProgressInfo, printSuccess } from '../../logic/beautiful-logs'
import { getPackageJson, b64HashingFunction } from '../../logic/project-files'
import { Events } from '../../components/analytics'
import { Result } from 'arg'
import { getAddressAndSignature, getCatalyst, sceneHasWorldCfg } from './utils'
import { buildScene } from '../build'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { LinkerResponse } from '../../linker-dapp/routes'
import { analyticsFeatures } from './analytics-features'

interface Options {
  args: Result<typeof args>
  components: CliComponents
}

interface ProgrammaticDeployResult {
  finish: () => Promise<void>
  stop: () => Promise<void>
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
  '-p': '--port',
  '--programmatic': Boolean
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
      --programmatic            Enable programmatic mode - returns a promise that resolves when deployment completes

    Example:
    - Deploy your scene:
      $ sdk-commands deploy
    - Deploy your scene to a specific content server:
      $ sdk-commands deploy --target my-favorite-catalyst-server.org:2323
    - Deploy programmatically:
      $ sdk-commands deploy --programmatic
`)
}

export async function main(options: Options): Promise<ProgrammaticDeployResult | void> {
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')
  const workspace = await getValidWorkspace(options.components, projectRoot)
  const project = workspace.projects[0]
  const openBrowser = !options.args['--no-browser']
  const skipBuild = options.args['--skip-build']
  const linkerPort = options.args['--port']
  const isProgrammatic = options.args['--programmatic']

  if (workspace.projects.length !== 1) {
    throw new CliError('DEPLOY_WORKSPACE_NOT_SUPPORTED', i18next.t('errors.deploy.workspace_not_supported'))
  }
  if (project.kind !== 'scene') {
    throw new CliError('DEPLOY_INVALID_PROJECT_TYPE', i18next.t('errors.deploy.invalid_project_type'))
  }
  if (options.args['--target'] && options.args['--target-content']) {
    throw new CliError('DEPLOY_INVALID_ARGUMENTS', i18next.t('errors.deploy.invalid_arguments'))
  }

  const sceneJson = await getValidSceneJson(options.components, projectRoot, { log: true })
  const coords = getBaseCoords(sceneJson)
  const isWorld = sceneHasWorldCfg(sceneJson)
  const trackProps: Events['Scene deploy started'] = {
    projectHash: b64HashingFunction(projectRoot),
    coords,
    isWorld
  }
  const packageJson = await getPackageJson(options.components, projectRoot)
  const dependencies = Array.from(
    new Set([...Object.keys(packageJson.dependencies || {}), ...Object.keys(packageJson.devDependencies || {})])
  )

  options.components.analytics.track('Scene deploy started', trackProps)

  if (!skipBuild) {
    await buildScene(
      { ...options, args: { '--dir': projectRoot, '--watch': false, '--production': true, _: [] } },
      project
    )
  }

  // Obtain list of files to deploy
  const files = await getFiles(options.components, projectRoot)
  validateFilesSizes(files)

  const contentFiles = new Map(files.map((file) => [file.path, new Uint8Array(file.content)]))
  const trackFeatures = await analyticsFeatures(options.components, resolve(projectRoot, sceneJson.main))

  const { entityId, files: entityFiles } = await DeploymentBuilder.buildEntity({
    type: EntityType.SCENE,
    pointers: sceneJson.scene.parcels,
    files: contentFiles,
    metadata: sceneJson
  })

  // Signing message
  const messageToSign = entityId

  // Start the linker dapp and wait for the user to sign in (linker response).
  // And then close the program
  const awaitResponse = future<void>()
  const { program } = await getAddressAndSignature(
    options.components,
    awaitResponse,
    messageToSign,
    sceneJson,
    files,
    !!options.args['--skip-validations'] || !!options.args['--target'] || !!options.args['--target-content'],
    {
      openBrowser,
      linkerPort,
      isHttps: !!options.args['--https']
    },
    deployEntity
  )

  // Programmatic mode early return
  if (isProgrammatic) {
    return {
      finish: async () => {
        const result = await awaitResponse
        void program?.stop()
        return result
      },
      stop: async () => {
        void program?.stop()
      }
    }
  }

  try {
    // Keep the CLI live till the user signs the payload
    await awaitResponse
  } finally {
    void program?.stop()
  }

  async function deployEntity(linkerResponse: LinkerResponse) {
    const { authChain, chainId } = linkerResponse

    // Uploading data
    const { client, url } = await getCatalyst(chainId, options.args['--target'], options.args['--target-content'])

    printProgressInfo(options.components.logger, `Uploading data to: ${url}...`)

    const deployData = { entityId, files: entityFiles, authChain }
    const position = sceneJson.scene.base
    const network = chainId === ChainId.ETHEREUM_SEPOLIA ? 'sepolia' : 'mainnet'
    const worldRealm = isWorld ? `&realm=${sceneJson.worldConfiguration?.name}` : ''
    const domain =
      chainId === ChainId.ETHEREUM_MAINNET ? 'https://play.decentraland.org' : 'https://play.decentraland.zone'
    const sceneUrl = `${domain}/?NETWORK=${network}&position=${position}${worldRealm}`

    try {
      options.components.logger.info(`Address: ${linkerResponse.address}`)
      options.components.logger.info(`AuthChain: ${linkerResponse.authChain}`)
      options.components.logger.info(`Network: ${getChainName(linkerResponse.chainId!)}`)

      const response = (await client.deploy(deployData, {
        timeout: 600000
      })) as { message?: string }
      if (response.message) {
        printProgressInfo(options.components.logger, response.message)
      }
      printSuccess(options.components.logger, 'Content uploaded successfully', sceneUrl)
      options.components.analytics.track('Scene deploy success', {
        ...trackProps,
        sceneId: entityId,
        targetContentServer: url,
        worldName: sceneJson.worldConfiguration?.name,
        isPortableExperience: !!sceneJson.isPortableExperience,
        dependencies,
        serverlessMultiplayer: trackFeatures.serverlessMultiplayer
      })

      if (!isWorld) {
        options.components.logger.info('You can close the terminal now')
      }
    } catch (e: any) {
      options.components.logger.error('Could not upload content:')
      options.components.logger.error(e.message)
      options.components.analytics.track('Scene deploy failure', { ...trackProps, error: e.message ?? '' })
      throw new CliError(
        'DEPLOY_UPLOAD_FAILED',
        i18next.t('errors.deploy.failed_to_upload', { error: e.message }),
        e.stack
      )
    }
  }
}
