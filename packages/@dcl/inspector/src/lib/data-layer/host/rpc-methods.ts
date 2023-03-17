import { IEngine } from '@dcl/ecs'
import { DataLayerRpcClient, FileSystemInterface } from '../types'
import { stream } from './stream'

export function initRpcMethods(fs: FileSystemInterface, engine: IEngine): DataLayerRpcClient {
  return {
    async redo() {
      return {}
    },
    async undo() {
      return {}
    },
    // This method receives an incoming message iterator
    // and returns an async iterable. consumption and production of messages
    // are decoupled operations
    async *stream(iter, ctx) {
      return stream(iter, { engine })
    }
  }
}
