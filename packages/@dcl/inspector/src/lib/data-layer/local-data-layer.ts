import { createEngine } from './logic/engine'
import { DataLayerInterface, Fs } from './types'
import { initRpcMethods } from './logic/rpc-methods'

export function createLocalDataLayer(_fs: Fs): DataLayerInterface {
  const engine = createEngine()
  // the server (datalayer) should also keep its internal "game loop" to process
  // all the incoming messages. we have this interval easy solution to mock that
  // game loop for the time being.
  // since the servers DO NOT run any game system, the only thing it does is to
  // process incoming and outgoing messages + dirty states
  setInterval(() => {
    engine.update(0.016).catch(($) => {
      console.error($)
      debugger
    })
  }, 16)

  return initRpcMethods(_fs, engine)
}
