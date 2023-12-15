import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getAssetCatalog, getDataLayerInterface, removeAsset, clearRemoveAsset } from '..'
import { Empty } from '../../../lib/data-layer/remote-data-layer'

export function* removeAssetSaga(action: ReturnType<typeof removeAsset>) {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const _response: Empty = yield call(dataLayer.removeAsset, action.payload)

    // Fetch asset catalog again
    yield put(getAssetCatalog())
    yield put(clearRemoveAsset(action.payload))
  } catch (e) {
    yield put(error({ error: ErrorType.RemoveAsset }))
  }
}
