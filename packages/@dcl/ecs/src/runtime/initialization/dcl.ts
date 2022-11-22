import { IEngine } from '../../engine'
import { _initEventObservables } from '../observables'

export function initializeDcl(engine: IEngine) {
  if (typeof dcl !== 'undefined') {
    dcl.loadModule('~system/EngineApi', {}).catch(dcl.error)

    dcl.onUpdate((dt: number) => {
      engine.update(dt)
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
