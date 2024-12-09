import { all, call, put } from 'redux-saga/effects'

import { ErrorType, IDataLayer, error, getDataLayerInterface } from '../'
import { updateAssetCatalog } from '../../app'
import { AssetCatalogResponse } from '../../../lib/data-layer/remote-data-layer'
import { AssetData } from '../../../lib/logic/catalog'

export function* getAssetCatalogSaga() {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const [assets, customAssetBuffers]: [AssetCatalogResponse, { assets: { data: Uint8Array }[] }] = yield all([
      call(dataLayer.getAssetCatalog, {}),
      call(dataLayer.getCustomAssets, {})
    ])
    const customAssets: AssetData[] = customAssetBuffers.assets.map((buffer) =>
      JSON.parse(new TextDecoder().decode(buffer.data))
    )
    yield put(updateAssetCatalog({ assets, customAssets }))
  } catch (e) {
    yield put(error({ error: ErrorType.GetAssetCatalog }))
  }
}
