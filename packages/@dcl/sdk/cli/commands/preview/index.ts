import path, { resolve } from 'path'
import future from 'fp-future'
import { Lifecycle, IBaseComponent } from '@well-known-components/interfaces'
import { roomsMetrics, createRoomsComponent } from '@dcl/mini-comms/dist/adapters/rooms'
import { createRecordConfigComponent } from '@well-known-components/env-config-provider'
import { createServerComponent } from '@well-known-components/http-server'
import { createConsoleLogComponent } from '@well-known-components/logger'
import { createTestMetricsComponent } from '@well-known-components/metrics'
import { createWsComponent } from './ws'

import { CliComponents } from '../../components'
import { getArgs } from '../../utils/args'
import { needsDependencies } from '../../commands/build/helpers'
import { ISignalerComponent, PreviewComponents } from './types'
import { validateExistingProject, validateSceneOptions } from './project'
import { previewPort } from './port'
import { providerInstance } from './eth'
import { wire } from './wire'
import { CliError } from '../../utils/error'

export function help() {
  return ``
}

interface Options {
  args: Omit<typeof args, '_'>
  components: Pick<CliComponents, 'fetch' | 'fs'>
}

export const args = getArgs({
  '--watch': Boolean,
  '-w': '--watch',
  '--dir': String,
  '--port': Number,
  '-p': '--port'
})

// copy/paste from https://github.com/decentraland/cli/blob/32de96bcfc4ef1c26c5580c7767ad6c8cac3b367/src/lib/Decentraland.ts
// TODO: refactor this stuff completely
export async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  await validateExistingProject(options.components, dir)
  await validateSceneOptions(options.components, dir)

  if (await needsDependencies(options.components, dir)) {
    const npmModulesPath = path.resolve(dir, 'node_modules')
    throw new CliError(`Couldn\'t find ${npmModulesPath}, please run: npm install`)
  }

  const port = options.args['--port'] || (await previewPort())

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
      await wire(components, dir, !!options.args['--watch'])
      await startComponents()
    }
  })

  return program
}
