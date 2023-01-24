import { resolve } from 'path'
import { Lifecycle } from '@well-known-components/interfaces'
import {
  roomsMetrics,
  createRoomsComponent
} from '@dcl/mini-comms/dist/adapters/rooms'
import { createRecordConfigComponent } from '@well-known-components/env-config-provider'
import { createServerComponent } from '@well-known-components/http-server'
import { createConsoleLogComponent } from '@well-known-components/logger'
import { createTestMetricsComponent } from '@well-known-components/metrics'
import { createWsComponent } from './ws'
import future from 'fp-future'

import { getArgs } from '../../utils/args'
import { main as handler } from '../../utils/handler'
import { PreviewComponents } from './types'
import { validateExistingProject, validateSceneOptions } from './project'
import { previewPort } from './port'
import { providerInstance } from './eth'
import { wire } from './wire'

export function help() {
  return ``
}

interface Options {
  args: Omit<typeof args, '_'>
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
export const main = handler(async function main(options: Options) {
  const dir = resolve(process.cwd(), options.args['--dir'] || '.')
  await validateExistingProject(dir)
  await validateSceneOptions(dir)

  const port = options.args['--port'] || (await previewPort())
  const startedFuture = future<void>()

  setTimeout(
    () => startedFuture.reject(new Error('Timed out starting the server')),
    3000
  )

  void Lifecycle.run<PreviewComponents>({
    async initComponents() {
      const metrics = createTestMetricsComponent(roomsMetrics)
      const config = createRecordConfigComponent({
        HTTP_SERVER_PORT: port.toString(),
        HTTP_SERVER_HOST: '0.0.0.0',
        ...process.env
      })
      const logs = await createConsoleLogComponent({})
      const ws = await createWsComponent({ logs })
      const server = await createServerComponent<PreviewComponents>(
        { config, logs, ws: ws.ws },
        { cors: {} }
      )
      const rooms = await createRoomsComponent({
        metrics,
        logs,
        config
      })

      return {
        logs,
        ethereumProvider: providerInstance,
        rooms,
        config,
        metrics,
        server,
        ws
      }
    },
    async main({ components, startComponents }) {
      try {
        await wire(dir, components, !!options.args['--watch'])
        await startComponents()
        startedFuture.resolve()
      } catch (err: any) {
        startedFuture.reject(err)
      }
    }
  })

  return
})
