jest.mock('../../packages/@dcl/sdk-commands/src/logic/open', () => ({ __esModule: true, default: jest.fn() }))

import * as net from 'net'
import { Router } from '../../packages/@dcl/sdk-commands/node_modules/@well-known-components/http-server'
import { runDapp } from '../../packages/@dcl/sdk-commands/src/run-dapp'
import { deployLinkerUri } from '../../packages/@dcl/sdk-commands/src/commands/deploy/utils'

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '0.0.0.0', () => {
      const address = server.address() as net.AddressInfo
      server.close(() => resolve(address.port))
    })
  })
}

describe('when running the linker dapp for a deployment', () => {
  let logger: { log: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock }
  let port: number
  let stop: () => Promise<void>

  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
    logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
    port = await freePort()
    const { program } = await runDapp({ logger } as any, new Router(), {
      openBrowser: true,
      linkerPort: port,
      isHttps: false,
      uri: deployLinkerUri('a1b2c3')
    })
    stop = () => program.stop()
  })

  afterEach(async () => {
    jest.clearAllTimers()
    jest.useRealTimers()
    await stop()
  })

  it('should print the linker URL carrying the deploy token', () => {
    expect(logger.info).toHaveBeenCalledWith(`App ready at http://localhost:${port}/?token=a1b2c3`)
  })
})
