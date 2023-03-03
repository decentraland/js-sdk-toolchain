import { AsyncQueue } from '@well-known-components/pushable-channel'
import { DataLayerInterface } from '.'
import { SceneContext } from '../babylon/decentraland/SceneContext'
import { serializeCrdtMessages } from './crdt-logger'
import { StreamReqRes } from './todo-protobuf'

export type BidirectionalEngineStream = (
  stream: AsyncIterable<Uint8Array>
) => AsyncGenerator<Uint8Array, void, undefined>

export async function connectSceneContextToLocalEngine(ctx: SceneContext, dataLayer: DataLayerInterface) {
  const outgoingMessages = new AsyncQueue<StreamReqRes>((_, _action) => {
    // console.log('SCENE QUEUE', action)
  })

  for await (const message of dataLayer.stream(outgoingMessages)) {
    // if (message.byteLength) console.log('SCENE Receiving from datalayer', message)
    if (message.data.byteLength) {
      Array.from(serializeCrdtMessages('Datalayer>SceneContext', message.data, ctx.engine)).forEach(($) =>
        console.log($)
      )
    }
    const res = await ctx.transport.receiveBatch(message.data)
    // if (res.byteLength) console.log('SCENE Sending to datalayer', res)
    if (res.byteLength) {
      Array.from(serializeCrdtMessages('SceneContext>Datalayer', res, ctx.engine)).forEach(($) => console.log($))
    }
    outgoingMessages.enqueue({ data: res })
  }
}
