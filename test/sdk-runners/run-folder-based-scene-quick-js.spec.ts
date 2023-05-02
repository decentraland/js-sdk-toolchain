/// <reference types="node" />

import { createRpcServer, createRpcClient } from '../../packages/@dcl/sdk-runners/node_modules/@dcl/rpc/dist'
import { MemoryTransport } from '../../packages/@dcl/sdk-runners/node_modules/@dcl/rpc/dist/transports/Memory'
import { mockedSceneFromFolder } from './MockedRendererScene'
import { setupEngineApiService, setupRuntimeService } from '../../packages/@dcl/sdk-runners/src/logic/apis-wiring'
import { startQuickJsSceneRuntime } from '../../packages/@dcl/sdk-runners/src/quick-js/runtime'
import { setInterval, clearInterval } from 'timers'
import { initComponents } from '../../packages/@dcl/sdk-commands/src/components'
import { runSdkCommand } from '../../packages/@dcl/sdk-commands/src/run-command'
import { SceneContext } from '../../packages/@dcl/sdk-runners/src/logic/scene-context'

test('folder scene loads, starts and all lifecycle messages are called', async () => {
  const components = await initComponents()
  // first build the scene
  await runSdkCommand(components, 'build', ['--dir=test/build-ecs/fixtures', '--customEntryPoint'])

  // then create the folder based renderer scene
  const rendererScene = await mockedSceneFromFolder(components, 'test/build-ecs/fixtures/ecs7-scene')
  console.dir(rendererScene)
  // 2nd step: create the rpc server & configure the handlers for each registered server port
  const rpcServer = createRpcServer<SceneContext>({})
  rpcServer.setHandler(async (port) => {
    setupEngineApiService(port)
    setupRuntimeService(port, () => undefined)
  })

  // 3rd step: create a transport pair. In this case we will use a in-memory transport
  //           which creates two mutually connected virtual sockets
  const { client: clientSocket, server: serverSocket } = MemoryTransport()

  // 4th step: create a client connection
  const clientPromise = createRpcClient(clientSocket)

  // 5th step: connect the "socket" to the server
  rpcServer.attachTransport(serverSocket, rendererScene)

  // the RPC client can multiplex multiple named sessions, we call them "ports"
  const client = await clientPromise
  const port = await client.createPort('port-name')

  const sceneUpdateInterval = setInterval(() => {
    rendererScene.update(function hasQuota() {
      return true
    })
    rendererScene.lateUpdate()
  }, 16)

  const crdtMessages: Uint8Array[] = []

  rendererScene.processIncomingMessages = (message) => {
    crdtMessages.push(message)
  }

  try {
    // once the socket is connected, we proceed to start the runtime
    await startQuickJsSceneRuntime(port, {
      log(...args) {
        process.stderr.write(JSON.stringify(args) + '\n')
      },
      error(...args) {
        console.error('[SCENE ERROR]' + JSON.stringify(args, null, 2))
        process.exitCode = 1
      },
      async updateLoop(opts) {
        process.stderr.write('llego process message\n')
        await opts.onStart()
        process.stderr.write('llego process message\n')
        await opts.onUpdate(0)
      }
    })
  } catch (er: any) {
    console.error(er)
    if (er instanceof Error) throw er
    throw new Error(er.toString())
  } finally {
    clearInterval(sceneUpdateInterval)
  }

  // expect(crdtMessages).toEqual([])
})
