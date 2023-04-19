import { Router } from '../../../../packages/@dcl/sdk-commands/node_modules/@well-known-components/http-server'
import { Authenticator } from '../../../../packages/@dcl/sdk-commands/node_modules/@dcl/crypto'

import * as sceneValidations from '../../../../packages/@dcl/sdk-commands/src/logic/scene-validations'
import * as projectFiles from '../../../../packages/@dcl/sdk-commands/src/logic/project-files'
import * as deployUtils from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/utils'
import { main as deploy } from '../../../../packages/@dcl/sdk-commands/src/commands/deploy'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import * as routes from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/linker-dapp/routes'
import { sceneJson } from './scene.json'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})
describe('deploy command', () => {
  it('happy path. Should open the linker-dapp', async () => {
    const components = await initComponents()
    jest.spyOn(sceneValidations, 'getValidSceneJson').mockResolvedValue(sceneJson)
    jest.spyOn(projectFiles, 'getPackageJson').mockResolvedValue({ dependencies: {}, devDependencies: {} })
    jest
      .spyOn(sceneValidations, 'getFiles')
      .mockResolvedValue([{ path: 'boedo/path', content: Buffer.from('casla'), size: 150 }])
    jest
      .spyOn(routes, 'setRoutes')
      .mockReturnValue({ router: new Router(), futureSignature: Promise.resolve({}) as any })

    jest.spyOn(deployUtils, 'getCatalyst').mockResolvedValue({
      deploy: async () => Promise.resolve({}),
      getContentUrl: () => 'boedo.casla.content'
    } as any)
    jest.spyOn(Authenticator, 'createSimpleAuthChain').mockReturnValue([])

    const spyResponse = jest.spyOn(deployUtils, 'getAddressAndSignature')

    await deploy({
      args: { _: [], '--skip-build': true, '--no-browser': true },
      components
    })

    expect(spyResponse).toReturn()
  })
})
