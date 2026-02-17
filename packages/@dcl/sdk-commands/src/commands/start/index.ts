import * as os from 'os'
import * as path from 'path'
import open from 'open'
import QRCode from 'qrcode'

import { CliComponents } from '../../components'
import { buildScene } from '../build'
import { declareArgs } from '../../logic/args'
import { getBaseCoords } from '../../logic/scene-validations'
import { getPort } from '../../logic/get-free-port'
import { PreviewComponents } from './types'
import { createTestMetricsComponent } from '@well-known-components/metrics'
import { Lifecycle } from '@well-known-components/interfaces'
import { createRecordConfigComponent } from '@well-known-components/env-config-provider'
import { createRoomsComponent, roomsMetrics } from '@dcl/mini-comms/dist/adapters/rooms'
import { createServerComponent } from '@well-known-components/http-server'
import { createConsoleLogComponent } from '@well-known-components/logger'
import { providerInstance } from '../../components/eth'
import { colors, createStderrCliLogger } from '../../components/log'
import { wireFileWatcherToWebSockets } from './server/file-watch-notifier'
import { wireRouter } from './server/routes'
import { createWsComponent } from './server/ws'
import { b64HashingFunction } from '../../logic/project-files'
import { DataLayer, createDataLayer } from './data-layer/rpc'
import { createExitSignalComponent } from '../../components/exit-signal'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { printCurrentProjectStarting, printProgressInfo, printWarning } from '../../logic/beautiful-logs'
import { Result } from 'arg'
import { startValidations } from '../../logic/project-validations'
import { runExplorerAlpha } from './explorer-alpha'
import { getLanUrl } from './utils'
import { spawnAuthServer } from './hammurabi-server'
import { ChildProcess } from 'child_process'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger' | 'analytics' | 'spawner'>
}

export const args = declareArgs({
  '--dir': String,
  '--help': Boolean,
  '--port': Number,
  '--no-debug': Boolean,
  '--no-browser': Boolean,
  '--no-watch': Boolean,
  '--ci': Boolean,
  '--skip-install': Boolean,
  '--web3': Boolean,
  '-h': '--help',
  '-p': '--port',
  '-d': '--no-debug',
  '-b': '--no-browser',
  '-w': '--no-watch',
  '--skip-build': Boolean,
  '--data-layer': Boolean,
  '--explorer-alpha': Boolean,
  '--web-explorer': Boolean,
  '--hub': Boolean,
  '--mobile': Boolean,
  '-m': '--mobile',
  // Params related to the explorer-alpha
  '--debug': Boolean,
  '--dclenv': String,
  '--realm': String,
  '--local-scene': Boolean,
  '--position': String,
  '--skip-auth-screen': Boolean,
  '--landscape-terrain-enabled': Boolean,
  '-n': Boolean,
  '--bevy-web': Boolean,
  '--no-client': Boolean
})

export async function help(options: Options) {
  options.components.logger.log(`
  Usage: sdk-commands start [options]

    Options:

      -h, --help                        Displays complete help
      -p, --port                        Select a custom port for the development server
      -d, --no-debug                    Disable debugging panel
      -b, --no-browser                  Do not open a new browser window
      -w, --no-watch                    Do not open watch for filesystem changes
      -c, --ci                          Run the parcel previewer on a remote unix server
      --web3                            Connects preview to browser wallet to use the associated avatar and account
      --skip-build                      Skip build and only serve the files in preview mode
      --web-explorer                    Launch the scene in the Web Explorer
      --debug                           Enables Debug panel mode inside DCL Explorer (default=true)
      --dclenv                          Decentraland Environment. Which environment to use for the content. This determines the catalyst server used, asset-bundles, etc. Possible values: org, zone, today. (default=org)
      --realm                           Realm used to serve the content. (default=Localhost)
      --local-scene                     Enable local scene development.
      --position                        Initial Position to start the explorer. (default=position defined at scene.json)
      --skip-auth-screen                Skip the auth screen (accepts 'true' or 'false').
      --landscape-terrain-enabled       Enable landscape terrain.
      -n                                Open a new instance of the Client even if one is already running.
      --bevy-web                        Opens preview using the Bevy Web browser window.
      --mobile                      Show QR code for mobile preview on the same network


    Examples:

    - Start a local development server for a Decentraland Scene at port 3500

      $ sdk-commands start -p 3500

    - Start a local development server for a Decentraland Scene at a docker container

      $ sdk-commands start --ci
`)
}

export async function main(options: Options) {
  let baseCoords = { x: 0, y: 0 }
  const workingDirectory = path.resolve(process.cwd(), options.args['--dir'] || '.')
  const isCi = options.args['--ci'] || process.env.CI || false
  const debug = !options.args['--no-debug'] && !isCi
  const openBrowser = !options.args['--no-browser'] && !isCi
  const build = !options.args['--skip-build']
  const watch = !options.args['--no-watch']
  const withDataLayer = options.args['--data-layer']
  const enableWeb3 = options.args['--web3']
  const isHub = !!options.args['--hub']
  const skipClient = !!options.args['--no-client']
  const bevyWeb = !!options.args['--bevy-web'] && !skipClient
  const isMobile = options.args['--mobile'] && !skipClient
  const explorerAlpha = !options.args['--web-explorer'] && !bevyWeb && !skipClient

  let hasSmartWearable = false
  const workspace = await getValidWorkspace(options.components, workingDirectory)

  /* istanbul ignore if */
  if (workspace.projects.length > 1)
    printWarning(options.components.logger, 'Support for multiple projects is still experimental.')

  for (const project of workspace.projects) {
    if (project.kind === 'smart-wearable') hasSmartWearable = true
    if (project.kind === 'scene' || project.kind === 'smart-wearable') {
      printCurrentProjectStarting(options.components.logger, project, workspace)

      // first run `npm run build`, this can be disabled with --skip-build
      // then start the embedded compiler, this can be disabled with --no-watch
      if (watch || build) {
        await buildScene({ ...options, args: { '--dir': project.workingDirectory, '--watch': watch, _: [] } }, project)
        await startValidations(options.components, project.workingDirectory)
      }

      // track the event
      baseCoords = getBaseCoords(project.scene)
      options.components.analytics.track('Preview started', {
        projectHash: await b64HashingFunction(project.workingDirectory),
        coords: baseCoords,
        isWorkspace: false,
        isPortableExperience: !!project.scene.isPortableExperience
      })
    }
  }

  printProgressInfo(options.components.logger, 'Starting preview server')

  const port = await getPort(options.args['--port'] || 0)
  const program = await Lifecycle.run<PreviewComponents>({
    async initComponents(): Promise<PreviewComponents> {
      const metrics = createTestMetricsComponent(roomsMetrics)
      const config = createRecordConfigComponent({
        HTTP_SERVER_PORT: port.toString(),
        HTTP_SERVER_HOST: '0.0.0.0',
        ...process.env
      })
      const logs = await createConsoleLogComponent({})
      const ws = await createWsComponent({ logs })
      const server = await createServerComponent<PreviewComponents>({ config, ws: ws.ws, logs }, { cors: {} })
      const rooms = await createRoomsComponent({
        metrics,
        logs,
        config
      })

      const signaler = createExitSignalComponent()

      return {
        ...options.components,
        logger: createStderrCliLogger(),
        logs,
        ethereumProvider: providerInstance,
        rooms,
        config,
        metrics,
        server,
        ws,
        signaler
      }
    },
    async main({ components, startComponents }) {
      let dataLayer: DataLayer | undefined
      if (withDataLayer) {
        try {
          const projectWorkingDir = workspace.projects[0]?.workingDirectory || workingDirectory
          dataLayer = await createDataLayer(components, projectWorkingDir)
        } catch (e: unknown) {
          components.logger.error(e as Error)
        }
      }

      await wireRouter(components, workspace, dataLayer)
      if (watch) {
        for (const project of workspace.projects) {
          await wireFileWatcherToWebSockets(
            components,
            project.workingDirectory,
            project.kind,
            !!explorerAlpha || !!bevyWeb
          )
        }
      }
      await startComponents()

      // Start Hammurabi server if needed (stored outside components to avoid lifecycle management)
      let hammurabiServer: ChildProcess | undefined
      const project = workspace.projects[0]
      if (project) {
        const realm = `http://localhost:${port}`
        hammurabiServer = spawnAuthServer(components, project, realm)

        // Register cleanup handler for hammurabi server
        if (hammurabiServer) {
          const cleanup = () => {
            if (hammurabiServer && !hammurabiServer.killed) {
              hammurabiServer.kill('SIGTERM')
            }
          }
          components.signaler.programClosed.then(cleanup).catch(() => {})
        }
      }

      const networkInterfaces = os.networkInterfaces()
      const availableURLs: string[] = []

      printProgressInfo(options.components.logger, 'Preview server is now running!')
      if (!explorerAlpha) {
        components.logger.log('Available on:\n')
      }

      Object.keys(networkInterfaces).forEach((dev) => {
        ;(networkInterfaces[dev] || []).forEach((details) => {
          if (details.family === 'IPv4') {
            const oldBackpack = 'DISABLE_backpack_editor_v2=&ENABLE_backpack_editor_v1'
            let addr = `http://${details.address}:${port}?position=${baseCoords.x}%2C${baseCoords.y}&${oldBackpack}`
            if (debug) {
              addr = `${addr}&SCENE_DEBUG_PANEL`
            }
            if (enableWeb3 || hasSmartWearable) {
              addr = `${addr}&ENABLE_WEB3`
            }

            availableURLs.push(addr)
          }
        })
      })

      // Get the LAN URL for external device access
      const lanUrl = getLanUrl(port)

      // Push localhost and 127.0.0.1 at top
      const sortedURLs = availableURLs.sort((a, _b) => {
        return a.toLowerCase().includes('localhost') || a.includes('127.0.0.1') || a.includes('0.0.0.0') ? -1 : 1
      })
      const bevyUrl = `https://decentraland.zone/bevy-web/?preview=true&realm=${
        new URL(sortedURLs[0]).origin
      }&position=${baseCoords.x},${baseCoords.y}`
      if (!explorerAlpha) {
        if (bevyWeb) {
          components.logger.log(`    ${bevyUrl}`)
        } else {
          for (const addr of sortedURLs) {
            components.logger.log(`    ${addr}`)
          }
        }
      }
      components.logger.log('\nPress CTRL+C to exit\n')

      if (explorerAlpha && !isMobile) {
        const realm = new URL(sortedURLs[0]).origin
        await runExplorerAlpha(components, { cwd: workingDirectory, realm, baseCoords, isHub, args: options.args })
      }

      if (options.args['--mobile'] && lanUrl) {
        const deepLink = `decentraland://open?preview=${lanUrl}&position=${baseCoords.x}%2C${baseCoords.y}`
        QRCode.toString(deepLink, { type: 'terminal', small: true }, (err, qr) => {
          if (!err) {
            components.logger.log(colors.bold('\nScan to preview on mobile: \n'))
            components.logger.log(qr)
            components.logger.log(`This QR redirects to ${deepLink} in your phone.`)
          }
        })
      }

      // Open preferably localhost/127.0.0.1
      if ((!explorerAlpha || bevyWeb) && openBrowser && sortedURLs.length) {
        try {
          const url = bevyWeb ? bevyUrl : sortedURLs[0]
          await open(url)
        } catch (_) {
          components.logger.warn('Unable to open browser automatically.')
        }
      }
      components.logger.log('\nPress CTRL+C to exit\n')
    }
  })

  // this signal is resolved by: (wkc)program.stop(), SIGTERM, SIGHUP
  // we must wait for it to resolve (when the server stops) to continue with the
  // program
  await program.components.signaler.programClosed
}
