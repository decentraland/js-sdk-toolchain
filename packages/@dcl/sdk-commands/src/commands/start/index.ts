import * as os from 'os'
import * as path from 'path'
import open from 'open'

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
import { createStderrCliLogger } from '../../components/log'
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
  '--desktop-client': Boolean,
  '--data-layer': Boolean
})

export async function help(options: Options) {
  options.components.logger.log(`
  Usage: sdk-commands start [options]

    Options:

      -h, --help                Displays complete help
      -p, --port        [port]  Select a custom port for the development server
      -d, --no-debug            Disable debugging panel
      -b, --no-browser          Do not open a new browser window
      -w, --no-watch            Do not open watch for filesystem changes
      -c, --ci                  Run the parcel previewer on a remote unix server
      --web3                    Connects preview to browser wallet to use the associated avatar and account
      --skip-build              Skip build and only serve the files in preview mode
      --desktop-client          Show URL to launch preview in the desktop client (BETA)

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
      const server = await createServerComponent<PreviewComponents>({ config, logs, ws: ws.ws }, { cors: {} })
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
          dataLayer = await createDataLayer(components)
        } catch (e: unknown) {
          components.logger.error(e as Error)
        }
      }

      await wireRouter(components, workspace, dataLayer)
      if (watch) {
        for (const project of workspace.projects) {
          await wireFileWatcherToWebSockets(components, project.workingDirectory, project.kind)
        }
      }
      await startComponents()

      const networkInterfaces = os.networkInterfaces()
      const availableURLs: string[] = []

      printProgressInfo(options.components.logger, 'Preview server is now running!')
      components.logger.log('Available on:\n')

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

      // Push localhost and 127.0.0.1 at top
      const sortedURLs = availableURLs.sort((a, _b) => {
        return a.toLowerCase().includes('localhost') || a.includes('127.0.0.1') || a.includes('0.0.0.0') ? -1 : 1
      })

      for (const addr of sortedURLs) {
        components.logger.log(`    ${addr}`)
      }

      if (options.args['--desktop-client']) {
        components.logger.log('\n  Desktop client:\n')
        for (const addr of sortedURLs) {
          const searchParams = new URLSearchParams()
          searchParams.append('PREVIEW-MODE', addr)
          components.logger.log(`    dcl://${searchParams.toString()}&`)
        }
      }

      components.logger.log('\n  Details:\n')
      components.logger.log('\nPress CTRL+C to exit\n')

      // Open preferably localhost/127.0.0.1
      if (openBrowser && sortedURLs.length && !options.args['--desktop-client']) {
        try {
          await open(sortedURLs[0])
        } catch (_) {
          components.logger.warn('Unable to open browser automatically.')
        }
      }
    }
  })

  // this signal is resolved by: (wkc)program.stop(), SIGTERM, SIGHUP
  // we must wait for it to resolve (when the server stops) to continue with the
  // program
  await program.components.signaler.programClosed
}
