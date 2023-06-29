import { call, put } from 'redux-saga/effects'

import { IDataLayer, getAssetCatalog, getDataLayerInterface, getInspectorPreferences } from '../'

export function* connectedSaga() {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  yield put(getInspectorPreferences())
  yield put(getAssetCatalog())
}
