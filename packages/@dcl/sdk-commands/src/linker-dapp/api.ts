import { Router, createServerComponent } from '@well-known-components/http-server'
import { Lifecycle } from '@well-known-components/interfaces'
import { createRecordConfigComponent } from '@well-known-components/env-config-provider'
import { createConsoleLogComponent } from '@well-known-components/logger'
import { resolve } from 'path'
import { ChainId } from '@dcl/schemas'
import open from 'open'

import { getPort } from '../logic/get-free-port'
import { CliComponents } from '../components'

export interface LinkerdAppOptions {
  openBrowser: boolean
  linkerPort?: number
  isHttps: boolean
  uri: string
}
export interface LinkerResponse {
  address: string
  signature: string
  chainId?: ChainId
}

export async function runLinkerApp(
  cliComponents: Pick<CliComponents, 'fs' | 'logger' | 'fetch' | 'config'>,
  router: Router<object>,
  { isHttps, openBrowser, uri, linkerPort }: LinkerdAppOptions
) {
  const resolvedPort = await getPort(linkerPort!)
  const protocol = isHttps ? 'https' : 'http'
  const url = `${protocol}://localhost:${resolvedPort}${uri}`
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
      components.server.setContext(components)
      components.server.use(router.allowedMethods())
      components.server.use(router.middleware())

      await startComponents()
      if (openBrowser) await browse(components, url)
    }
  })
  return { program }
}

async function browse({ logger }: Pick<CliComponents, 'logger'>, url: string) {
  logger.info('You need to sign the content before the deployment:')

  setTimeout(async () => {
    try {
      await open(`${url}`)
    } catch (e) {
      logger.error(`Unable to open browser automatically. Please manually navigate to:\n  ${url}`)
    }
  }, 5000)

  logger.info(`Signing app ready at ${url}`)
}

async function getCredentials({ fs }: Pick<CliComponents, 'fs' | 'logger'>) {
  const privateKey = await fs.readFile(resolve(__dirname, '../../../certs/localhost.key'), 'utf-8')
  const certificate = await fs.readFile(resolve(__dirname, '../../../certs/localhost.crt'), 'utf-8')
  return { key: privateKey, cert: certificate }
}

export function getContentType(type: string) {
  switch (type) {
    case 'css':
      return 'text/css'
    case 'js':
      return 'application/js'
    case 'media':
    default:
      return 'text/plain'
  }
}
