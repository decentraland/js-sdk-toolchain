import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getDataLayerInterface, getThumbnails, saveThumbnail } from '..'
import { Empty } from '../../../lib/data-layer/remote-data-layer'
import { queue } from '../../../lib/sdk/connect-ws'
import { MessageType } from '../../../lib/data-layer/host/ws'
import { encode } from './import-asset'

export function* saveThumbnailSaga(action: ReturnType<typeof saveThumbnail>) {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const _response: Empty = yield call(dataLayer.saveFile, action.payload)

    queue.enqueue({ type: MessageType.FS, data: new Uint8Array(encode({})) })

    // Fetch thumbnails again
    yield put(getThumbnails())
  } catch (e) {
    yield put(error({ error: ErrorType.SaveThumbnail }))
  }
}
