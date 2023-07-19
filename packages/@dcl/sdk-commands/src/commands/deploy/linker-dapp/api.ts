import { createServerComponent } from '@well-known-components/http-server'
import { Lifecycle } from '@well-known-components/interfaces'
import { createRecordConfigComponent } from '@well-known-components/env-config-provider'
import { createConsoleLogComponent } from '@well-known-components/logger'
import { resolve } from 'path'
import { ChainId, Scene } from '@dcl/schemas'
import querystring from 'querystring'
import open from 'open'
import { IFuture } from 'fp-future'

import { getPort } from '../../../logic/get-free-port'
import { IFile } from '../../../logic/scene-validations'
import { CliComponents } from '../../../components'
import { setRoutes } from './routes'
import { getEstateRegistry, getLandRegistry } from '../../../logic/config'
import { sceneHasWorldCfg } from '../utils'

export interface LinkerResponse {
  address: string
  signature: string
  chainId?: ChainId
}

export interface SceneInfo {
  baseParcel: string
  parcels: string[]
  rootCID: string
  landRegistry?: string
  estateRegistry?: string
  debug: boolean
  title?: string
  description?: string
  skipValidations: boolean
  isPortableExperience: boolean
  isWorld: boolean
}

export async function runLinkerApp(
  cliComponents: Pick<CliComponents, 'fs' | 'logger' | 'fetch' | 'config'>,
  awaitResponse: IFuture<void>,
  scene: Scene,
  files: IFile[],
  port: number,
  rootCID: string,
  { isHttps, skipValidations, openBrowser }: { isHttps: boolean; skipValidations: boolean; openBrowser: boolean },
  deployCallback: (linkerResponse: LinkerResponse) => Promise<void>
) {
  const resolvedPort = await getPort(port)
  const sceneInfo = await getSceneInfo(cliComponents, scene, rootCID, skipValidations)
  const protocol = isHttps ? 'https' : 'http'
  const queryParams = querystring.stringify(sceneInfo)
  const url = `${protocol}://localhost:${resolvedPort}`
  const program = await Lifecycle.run({
    async initComponents() {
      const config = createRecordConfigComponent({
        HTTP_SERVER_PORT: resolvedPort.toString(),
        HTTP_SERVER_HOST: '0.0.0.0',
        ...process.env
      })
      const logs = await createConsoleLogComponent({})

      const https = isHttps ? await getCredentials(cliComponents) : undefined

      const server = await createServerComponent({ ...cliComponents, config, logs }, { https, cors: {} })

      return { ...cliComponents, config, logs, server }
    },
    async main(program) {
      const { components, startComponents } = program
      const { router } = setRoutes(components, awaitResponse, files, sceneInfo, deployCallback)
      components.server.setContext(components)
      components.server.use(router.allowedMethods())
      components.server.use(router.middleware())

      await startComponents()
      if (openBrowser) await browse(components, url, queryParams)
    }
  })
  return { program }
}

async function browse({ logger }: Pick<CliComponents, 'logger'>, url: string, params: string) {
  logger.info('You need to sign the content before the deployment:')

  setTimeout(async () => {
    try {
      await open(`${url}?${params}`)
    } catch (e) {
      logger.error(`Unable to open browser automatically. Please manually navigate to:\n  ${url}?${params}`)
    }
  }, 5000)

  logger.info(`Signing app ready at ${url}?${params}`)
}

async function getCredentials({ fs }: Pick<CliComponents, 'fs' | 'logger'>) {
  const privateKey = await fs.readFile(resolve(__dirname, '../../../certs/localhost.key'), 'utf-8')
  const certificate = await fs.readFile(resolve(__dirname, '../../../certs/localhost.crt'), 'utf-8')
  return { key: privateKey, cert: certificate }
}

async function getSceneInfo(
  components: Pick<CliComponents, 'config'>,
  scene: Scene,
  rootCID: string,
  skipValidations: boolean
) {
  const {
    scene: { parcels, base },
    display,
    isPortableExperience
  } = scene

  return {
    baseParcel: base,
    parcels,
    rootCID,
    landRegistry: await getLandRegistry(components),
    estateRegistry: await getEstateRegistry(components),
    debug: !!process.env.DEBUG,
    title: display?.title,
    description: display?.description,
    skipValidations,
    isPortableExperience: !!isPortableExperience,
    isWorld: sceneHasWorldCfg(scene)
  }
}
