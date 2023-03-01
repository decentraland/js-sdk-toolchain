import { IEngine } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import { DataLayerInterface } from '.'
import { SceneContext } from '../babylon/decentraland/SceneContext'

export type BidirectionalEngineStream = (
  stream: AsyncIterable<Uint8Array>
) => AsyncGenerator<Uint8Array, void, undefined>

export async function connectSceneContextToLocalEngine(ctx: SceneContext, dataLayer: DataLayerInterface) {
  const outgoingMessages = new AsyncQueue<Uint8Array>((_, _action) => {
    // console.log('SCENE QUEUE', action)
  })

  for await (const message of dataLayer.getEngineUpdates(outgoingMessages)) {
    // console.log('SCENE Receiving from datalayer', message)
    const res = await ctx.transport.receiveBatch(message)
    // if (res.byteLength) console.log('SCENE Sending to datalayer', res)
    outgoingMessages.enqueue(res)
  }
}
