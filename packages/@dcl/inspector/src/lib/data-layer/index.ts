import { IEngine } from '@dcl/ecs'
import { BidirectionalEngineStream, connectSceneTransport } from './rpc-engine'

export type DataLayerInterface = {
  undo(): Promise<any>
  redo(): Promise<any>
  createTransport: BidirectionalEngineStream
}

export function getDataLayerRpc(scene: IEngine): DataLayerInterface {
  return {
    async undo() {},
    async redo() {},
    createTransport: connectSceneTransport(scene)
  }
}
