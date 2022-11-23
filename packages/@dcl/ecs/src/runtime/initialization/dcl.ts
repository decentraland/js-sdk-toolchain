import { IEngine } from '../../engine'
import { RendererTranport } from '../../systems/crdt/transports/rendererTransport'
import { _initEventObservables } from '../observables'

export function initializeDcl(
  engine: IEngine,
  rendererTransport: RendererTranport
) {
  if (typeof dcl !== 'undefined') {
    dcl.loadModule('~system/EngineApi', {}).catch(dcl.error)

    dcl.onUpdate((dt: number) => {
      engine.update(dt)
      if (!rendererTransport.wasCalled()) {
        rendererTransport.send(new Uint8Array([]))
      }
      rendererTransport.clearWasCalledFlag()
    })

    _initEventObservables()

    return {
      log: dcl.log,
      error: dcl.error
    }
  }

  return {
    log: voidFn,
    error: voidFn
  }
}

function voidFn() {}
