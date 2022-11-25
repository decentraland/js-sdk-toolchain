/// <reference types="@dcl/js-runtime" />

import { TransportMessage, Transport } from '../types'
import { ECSComponentIDs } from '../../../components/generated/ids.gen'

const componentIds = Object.values(ECSComponentIDs)
  .filter((a) => typeof a === 'number')
  .map(Number)

// TODO: replace with module
declare let require: any

export function createRendererTransport(): Transport {
  const type = 'renderer'
  const engineApi = require('~system/EngineApi')
  return {
    type,
    send(message: Uint8Array): void {
      engineApi
        .crdtSendToRenderer({ data: new Uint8Array(message) })
        .catch(() => {
          debugger
        })
    },
    filter(message: TransportMessage): boolean {
      // Echo message, ignore them
      if (message.transportType === type) {
        return false
      }

      // Only send renderer components (Proto Generated)
      if (!componentIds.includes(message.componentId)) {
        return false
      }

      return !!message
    }
  }
}
