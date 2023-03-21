import * as os from 'os'
import * as path from 'path'
import open from 'open'
import future from 'fp-future'

import { CliComponents } from '../../components'
import { main as build } from '../build'
import { getArgs, getArgsUsed } from '../../logic/args'
import { needsDependencies, npmRun } from '../../logic/project-validations'
import { getBaseCoords, getValidSceneJson } from '../../logic/scene-validations'
import { CliError } from '../../logic/error'
import { getPort } from '../../logic/get-free-port'
import { ISignalerComponent, PreviewComponents } from './types'
import { createTestMetricsComponent } from '@well-known-components/metrics'
import { Lifecycle, IBaseComponent } from '@well-known-components/interfaces'
import { createRecordConfigComponent } from '@well-known-components/env-config-provider'
import { createRoomsComponent, roomsMetrics } from '@dcl/mini-comms/dist/adapters/rooms'
import { createServerComponent } from '@well-known-components/http-server'
import { createConsoleLogComponent } from '@well-known-components/logger'
import { providerInstance } from '../../components/eth'
import { createStdoutCliLogger } from '../../components/log'
import { wireFileWatcherToWebSockets } from './server/file-watch-notifier'
import { wireRouter } from './server/routes'
import { createWsComponent } from './server/ws'
import { b64HashingFunction } from '../../logic/project-files'
import { createDataLayerRpc } from './data-layer/rpc'

interface Options {
  args: typeof args
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger' | 'dclInfoConfig' | 'analytics'>
}

export const args = getArgs({
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

export async function help() {
  return `
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
`
}

export async function main(options: Options) {
  const projectRoot = path.resolve(process.cwd(), options.args['--dir'] || '.')
  const isCi = args['--ci'] || process.env.CI || false
  const debug = !args['--no-debug'] && !isCi
  const openBrowser = !args['--no-browser'] && !isCi
  const skipBuild = args['--skip-build']
  const watch = !args['--no-watch']
  const withDataLayer = args['--data-layer']
  const enableWeb3 = args['--web3']

  // TODO: FIX this hardcoded values ?
  const hasPortableExperience = false

  // first run `npm run build`, this can be disabled with --skip-build
  if (!skipBuild) {
    await npmRun(projectRoot, 'build')
  }

  // then start the embedded compiler, this can be disabled with --no-watch
  if (watch) {
    await build({ ...options, args: { '--dir': projectRoot, '--watch': watch, _: [] } })
  }

  const sceneJson = await getValidSceneJson(options.components, projectRoot)
  const baseCoords = getBaseCoords(sceneJson)

  if (await needsDependencies(options.components, projectRoot)) {
    const npmModulesPath = path.resolve(projectRoot, 'node_modules')
    throw new CliError(`Couldn\'t find ${npmModulesPath}, please run: npm install`)
  }

  const port = await getPort(options.args['--port'])
  const program = await Lifecycle.run<PreviewComponents>({
    async initComponents() {
      const metrics = createTestMetricsComponent(roomsMetrics)
      const config = createRecordConfigComponent({
        HTTP_SERVER_PORT: port.toString(),
        HTTP_SERVER_HOST: '0.0.0.0',
        ...process.env
      })
      const logs = await createConsoleLogComponent({})
      const ws = await createWsComponent({ logs })
      const server = await createServerComponent<PreviewComponents>({ config, logs, ws: ws.ws }, {})
      const rooms = await createRoomsComponent({
        metrics,
        logs,
        config
      })

      const programClosed = future<void>()
      const signaler: IBaseComponent & ISignalerComponent = {
        programClosed,
        async stop() {
          // this promise is resolved upon SIGTERM or SIGHUP
          // or when program.stop is called
          programClosed.resolve()
        }
      }

      return {
        ...options.components,
        logger: createStdoutCliLogger(),
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
      const dataLayerRpc = withDataLayer ? await createDataLayerRpc({ fs: components.fs }) : undefined
      await wireRouter(components, projectRoot, dataLayerRpc)
      if (watch) {
        await wireFileWatcherToWebSockets(components, projectRoot)
      }
      await startComponents()

      const networkInterfaces = os.networkInterfaces()
      const availableURLs: string[] = []
      components.analytics.trackSync('Preview started', {
        projectHash: await b64HashingFunction(projectRoot),
        coords: baseCoords,
        isWorkspace: false,
        args: getArgsUsed(options.args)
      })
      components.logger.log(`Preview server is now running!`)
      components.logger.log('Available on:\n')

      Object.keys(networkInterfaces).forEach((dev) => {
        ;(networkInterfaces[dev] || []).forEach((details) => {
          if (details.family === 'IPv4') {
            let addr = `http://${details.address}:${port}?position=${baseCoords.x}%2C${baseCoords.y}`
            if (debug) {
              addr = `${addr}&SCENE_DEBUG_PANEL`
            }
            if (enableWeb3 || hasPortableExperience) {
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

      if (args['--desktop-client']) {
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
      if (openBrowser && sortedURLs.length && !args['--desktop-client']) {
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
