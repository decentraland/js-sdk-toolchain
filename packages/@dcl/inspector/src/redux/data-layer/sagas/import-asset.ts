import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getAssetCatalog, getDataLayerInterface, importAsset } from '..'
import { Empty } from '../../../lib/data-layer/remote-data-layer'

export function* importAssetSaga(action: ReturnType<typeof importAsset>) {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const _response: Empty = yield call(dataLayer.importAsset, action.payload)

    // Fetch asset catalog again
    yield put(getAssetCatalog())
  } catch (e) {
    yield put(error({ error: ErrorType.ImportAsset }))
  }
}
