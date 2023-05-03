import { createServerComponent } from '@well-known-components/http-server'
import { Lifecycle } from '@well-known-components/interfaces'
import { createRecordConfigComponent } from '@well-known-components/env-config-provider'
import { createConsoleLogComponent } from '@well-known-components/logger'
import { resolve } from 'path'
import { getChainName, ChainId, Scene } from '@dcl/schemas'
import querystring from 'querystring'
import open from 'open'

import { getPort } from '../../../logic/get-free-port'
import { IFile } from '../../../logic/scene-validations'
import { CliComponents } from '../../../components'
import { printSuccess } from '../../../logic/beautiful-logs'
import { setRoutes } from './routes'
import { getEstateRegistry, getLandRegistry } from '../../../logic/config'
import future from 'fp-future'

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
}

export async function runLinkerApp(
  cliComponents: Pick<CliComponents, 'fs' | 'logger' | 'fetch' | 'config'>,
  scene: Scene,
  files: IFile[],
  port: number,
  rootCID: string,
  { isHttps, skipValidations, openBrowser }: { isHttps: boolean; skipValidations: boolean; openBrowser: boolean }
) {
  const resolvedPort = await getPort(port)
  const sceneInfo = await getSceneInfo(cliComponents, scene, rootCID, skipValidations)
  const protocol = isHttps ? 'https' : 'http'
  const queryParams = querystring.stringify(sceneInfo)
  const url = `${protocol}://localhost:${resolvedPort}`
  const futureResponse = future<LinkerResponse>()
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
    async main({ components, startComponents }) {
      const { router, futureSignature } = setRoutes(components, files, sceneInfo)
      components.server.setContext(components)
      components.server.use(router.allowedMethods())
      components.server.use(router.middleware())

      await startComponents()
      if (openBrowser) await browse(components, url, queryParams)

      const value = await futureSignature
      printSuccess(components.logger, `\nContent successfully signed.`, '')
      components.logger.info(`Address: ${value.address}`)
      components.logger.info(`Signature: ${value.signature}`)
      components.logger.info(`Network: ${getChainName(value.chainId!)}`)
      futureResponse.resolve(value)
    }
  })
  return { program, linkerResponse: futureResponse }
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
    display
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
    skipValidations
  }
}
