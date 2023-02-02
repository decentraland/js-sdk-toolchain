import path from 'path'
import fs from 'fs-extra'

import { setupBffAndComms } from './bff'
import {
  ILoggerComponent,
  IMetricsComponent,
  IHttpServerComponent,
  IConfigComponent
} from '@well-known-components/interfaces'
import { HTTPProvider } from 'eth-connect'
import { RoomComponent } from '@dcl/mini-comms/dist/adapters/rooms'
import { Router } from '@well-known-components/http-server'
import { WebSocketComponent } from './ws'
import { setupEcs6Endpoints } from './endpoints'
import { CliError } from '../../utils/error'

export type PreviewComponents = {
  logs: ILoggerComponent
  server: IHttpServerComponent<PreviewComponents>
  config: IConfigComponent
  metrics: IMetricsComponent<any>
  ethereumProvider: HTTPProvider
  rooms: RoomComponent
  ws: WebSocketComponent
}

export async function wire(dir: string, components: PreviewComponents, watch: boolean = false) {
  const npmModulesPath = path.resolve(dir, 'node_modules')

  // TODO: dcl.project.needsDependencies() should do this
  if (!fs.pathExistsSync(npmModulesPath)) {
    throw new CliError(`Couldn\'t find ${npmModulesPath}, please run: npm install`)
  }

  const router = new Router<PreviewComponents>()

  await setupBffAndComms(components, router)
  setupEcs6Endpoints(dir, router)
  if (watch) {
    // add "watch"
    // awai2t bindWatch(components, sceneUpdateClients)
  }

  components.server.setContext(components)
  components.server.use(router.allowedMethods())
  components.server.use(router.middleware())
}
