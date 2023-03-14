import { IEngine } from '@dcl/ecs'
import { DataLayerInterface, Fs } from '../types'
import { stream } from './stream'

export function initRpcMethods(fs: Fs, engine: IEngine): DataLayerInterface {
  return {
    async init() {
      return {}
    },
    async undo() {
      return {}
    },
    // This method receives an incoming message iterator
    // and returns an async iterable. consumption and production of messages
    // are decoupled operations
    stream: function (iter) {
      return stream(iter, { engine })
    }
  }
}
