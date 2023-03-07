import { IEngine, Transport } from '@dcl/ecs'
import { createRpcServer, RpcServerPort } from '@dcl/rpc'
import * as codegen from '@dcl/rpc/dist/codegen'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import { DataServiceDefinition, StreamReqRes } from '@dcl/protocol/out-js/decentraland/sdk/editor/data_service.gen'

import { serializeEngine } from './engine'

export type DataLayerContext = {
  engine: IEngine
}

export function createDataLayerRpc() {
  const rpcServer = createRpcServer<DataLayerContext>({})
  rpcServer.setHandler(rpcHandler)

  async function rpcHandler(serverPort: RpcServerPort<DataLayerContext>) {
    registerDataService(serverPort)
  }

  return rpcServer
}

function registerDataService(port: RpcServerPort<DataLayerContext>) {
  codegen.registerService(port, DataServiceDefinition, async () => ({
    async init(_req, _ctx) {
      return {}
    },
    async undo() {
      return {}
    },

    // DataLayer <---> Inspector
    // DataLayer <---> Babylon
    stream(req: AsyncIterable<StreamReqRes>, { engine }: DataLayerContext) {
      const queue = new AsyncQueue<StreamReqRes>(() => {})
      queue.enqueue({ data: serializeEngine(engine) })

      const transport: Transport = {
        filter() {
          return !queue.closed
        },
        async send(message) {
          if (queue.closed) return
          queue.enqueue({ data: message })
        }
      }
      engine.addTransport(transport)

      async function streamMessages() {
        for await (const it of req) {
          if (it.data.byteLength) {
            transport.onmessage!(it.data)
            void engine.update(1)
          }
        }
      }
      void streamMessages().catch(() => {
        if (!queue.closed) queue.close()
      })
      return queue
    }
  }))
}
