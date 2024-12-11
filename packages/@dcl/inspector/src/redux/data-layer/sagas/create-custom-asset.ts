import { PayloadAction } from '@reduxjs/toolkit'
import { call, put } from 'redux-saga/effects'
import { IDataLayer, error, getAssetCatalog, getDataLayerInterface } from '../index'
import { ErrorType } from '../index'
import { AssetData } from '../../../lib/logic/catalog'
import { selectAssetsTab } from '../../ui'
import { AssetsTab } from '../../ui/types'

export function* createCustomAssetSaga(
  action: PayloadAction<{ composite: AssetData['composite']; resources: string[] }>
) {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    yield call(dataLayer.createCustomAsset, {
      name: 'sabe',
      composite: Buffer.from(JSON.stringify(action.payload.composite)),
      resources: action.payload.resources
    })
    // Fetch asset catalog again
    yield put(getAssetCatalog())
    yield put(selectAssetsTab({ tab: AssetsTab.CustomAssets }))
  } catch (e) {
    yield put(error({ error: ErrorType.CreateCustomAsset }))
  }
}
