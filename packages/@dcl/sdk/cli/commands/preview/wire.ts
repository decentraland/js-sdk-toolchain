import path from 'path'
import fs from 'fs-extra'

import { setupBffAndComms } from './bff'
import { Router } from '@well-known-components/http-server'
import { setupEcs6Endpoints } from './endpoints'
import { CliError } from '../../utils/error'
import { PreviewComponents } from './types'

export async function wire(dir: string, components: PreviewComponents) {
  const npmModulesPath = path.resolve(dir, 'node_modules')

  // TODO: dcl.project.needsDependencies() should do this
  if (!fs.pathExistsSync(npmModulesPath)) {
    throw new CliError(`Couldn\'t find ${npmModulesPath}, please run: npm install`)
  }

  const router = new Router<PreviewComponents>()

  await setupBffAndComms(components, router)
  setupEcs6Endpoints(dir, router)

  components.server.setContext(components)
  components.server.use(router.allowedMethods())
  components.server.use(router.middleware())
}
