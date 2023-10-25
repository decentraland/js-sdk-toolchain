import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getDataLayerInterface, getThumbnails, saveThumbnail } from '..'
import { Empty } from '../../../lib/data-layer/remote-data-layer'

export function* saveThumbnailSaga(action: ReturnType<typeof saveThumbnail>) {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const _response: Empty = yield call(dataLayer.saveFile, action.payload)

    // Fetch thumbnails again
    yield put(getThumbnails())
  } catch (e) {
    yield put(error({ error: ErrorType.SaveThumbnail }))
  }
}
