import { call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getDataLayerInterface } from '../'
import { updateAssetCatalog } from '../../app'
import { AssetCatalogResponse } from '../../../lib/data-layer/remote-data-layer'

export function* getAssetCatalogSaga() {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const assets: AssetCatalogResponse = yield call(dataLayer.getAssetCatalog, {})
    yield put(updateAssetCatalog({ assets }))
  } catch (e) {
    yield put(error({ error: ErrorType.GetAssetCatalog }))
  }
}
