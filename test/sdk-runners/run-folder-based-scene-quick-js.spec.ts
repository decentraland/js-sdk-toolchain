/// <reference types="node" />

import { createRpcServer, createRpcClient } from '../../packages/@dcl/sdk-runners/node_modules/@dcl/rpc/dist'
import { MemoryTransport } from '../../packages/@dcl/sdk-runners/node_modules/@dcl/rpc/dist/transports/Memory'
import { MockedRendererScene } from './MockedRendererScene'
import { setupEngineApiService, setupRuntimeService } from '../../packages/@dcl/sdk-runners/src/logic/apis-wiring'
import { startQuickJsSceneRuntime } from '../../packages/@dcl/sdk-runners/src/quick-js/runtime'
import { setInterval, clearInterval } from 'timers'

test('scene loads, starts and all lifecycle messages are called', async () => {
  const code = `
    const engineApi = require('~system/EngineApi')
    module.exports.onStart = async function () {
      console.log(await engineApi.crdtGetState({ data: Uint8Array.of() }))
    }
    
    module.exports.onUpdate = async function () {
      console.log(await engineApi.crdtSendToRenderer({ data: Uint8Array.of() }))
    }
  `

  // 1st step: create the local scene object
  const rendererScene = new MockedRendererScene(code)

  // 2nd step: create the rpc server & configure the handlers for each registered server port
  const rpcServer = createRpcServer<MockedRendererScene>({})
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

  // we are going to use the log function to come in and out the runtime
  const log = jest.fn()

  // register a interval timer to emulate the renderer's tick. this is necessary
  // to release the backpressure by responding to the tick, as defined in ADR-148
  let currentRenderFrameCounter = 0

  let messagesOverQuota = 0

  const sceneUpdateInterval = setInterval(() => {
    currentRenderFrameCounter++
    rendererScene.update(function hasQuota() {
      // simple testing mechanism for hasQuota
      if (messagesOverQuota) {
        messagesOverQuota--
        return false
      }
      return true
    })
    rendererScene.lateUpdate()
  }, 16)

  try {
    // once the socket is connected, we proceed to start the runtime
    await startQuickJsSceneRuntime(port, {
      log(...args) {
        process.stderr.write(JSON.stringify(args) + '\n')
        log(...args)
      },
      error(...args) {
        console.error('[SCENE ERROR]' + JSON.stringify(args, null, 2))
        process.exitCode = 1
      },
      async updateLoop(opts) {
        expect(rendererScene.currentTick).toEqual(0)

        expect(log).not.toHaveBeenCalled()
        await opts.onStart()
        expect(log).toHaveBeenCalled()

        {
          expect(rendererScene.currentTick).toEqual(1)
          const initialRenderFrame = currentRenderFrameCounter
          await opts.onUpdate(0)
          expect(rendererScene.currentTick).toEqual(2)
          // this frame will render within one frame
          expect(currentRenderFrameCounter - 1).toEqual(initialRenderFrame)
        }

        {
          // we are going to wait ten frames to "finish the tick"
          messagesOverQuota = 10
          const initialRenderFrame = currentRenderFrameCounter
          await opts.onUpdate(1)
          expect(rendererScene.currentTick).toEqual(3)
          // this frame will render within MORE THAN one frame
          expect(currentRenderFrameCounter).toBeGreaterThan(initialRenderFrame)
        }
      }
    })
  } catch (er: any) {
    console.error(er)
    if (er instanceof Error) throw er
    throw new Error(er.toString())
  } finally {
    clearInterval(sceneUpdateInterval)
  }
})
