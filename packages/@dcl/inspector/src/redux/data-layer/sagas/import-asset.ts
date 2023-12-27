import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getAssetCatalog, getDataLayerInterface, importAsset } from '..'
import { Empty } from '../../../lib/data-layer/remote-data-layer'
import { queue } from '../../../lib/sdk/connect-ws'
import { MessageType } from '../../../lib/data-layer/host/ws'

const encoder = new TextEncoder()

export function encode(data: Record<string, unknown>): Uint8Array {
  return encoder.encode(JSON.stringify(data))
}

export function* importAssetSaga(action: ReturnType<typeof importAsset>) {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const _response: Empty = yield call(dataLayer.importAsset, action.payload)

    queue.enqueue({ type: MessageType.FS, data: new Uint8Array(encode({})) })

    // Fetch asset catalog again
    yield put(getAssetCatalog())
  } catch (e) {
    yield put(error({ error: ErrorType.ImportAsset }))
  }
}
