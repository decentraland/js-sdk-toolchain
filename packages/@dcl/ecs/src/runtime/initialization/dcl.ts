/// <reference types="@dcl/posix" />

import { IEngine } from '../../engine'
import { _initEventObservables } from '../observables'
import { Transport } from '../types'

export function initializeDcl(engine: IEngine, rendererTransport: Transport) {
  if (typeof dcl !== 'undefined') {
    dcl.loadModule('~system/ExperimentalApi', {}).catch(dcl.error)

    async function pullRendererMessages() {
      const response = await dcl.callRpc(
        '~system/ExperimentalApi',
        'messageFromRenderer',
        []
      )

      if (response.data?.length) {
        if (rendererTransport.onmessage) {
          for (const byteArray of response.data) {
            rendererTransport.onmessage(byteArray)
          }
        }
      }
    }

    dcl.onUpdate((dt: number) => {
      pullRendererMessages()
        .catch(dcl.error)
        .finally(() => engine.update(dt))
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
