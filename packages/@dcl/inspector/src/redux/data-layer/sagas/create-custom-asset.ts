import { PayloadAction } from '@reduxjs/toolkit'
import { call, put } from 'redux-saga/effects'
import { IDataLayer, error, getAssetCatalog, getDataLayerInterface } from '../index'
import { ErrorType } from '../index'
import { AssetData } from '../../../lib/logic/catalog'
import { selectAssetsTab } from '../../ui'
import { AssetsTab } from '../../ui/types'
import { getResourcesFromModels } from '../../../lib/babylon/decentraland/get-resources'

export function* createCustomAssetSaga(
  action: PayloadAction<{ name: string; composite: AssetData['composite']; resources: string[] }>
) {
  const dataLayer: IDataLayer = yield call(getDataLayerInterface)
  if (!dataLayer) return
  try {
    const models = action.payload.resources.filter(
      (resource) => resource.endsWith('.gltf') || resource.endsWith('.glb')
    )
    const resourcesFromModels: string[] = yield call(getResourcesFromModels, models)
    const resources = [...action.payload.resources, ...resourcesFromModels]
    yield call(dataLayer.createCustomAsset, {
      name: action.payload.name,
      composite: Buffer.from(JSON.stringify(action.payload.composite)),
      resources
    })
    // Fetch asset catalog again
    yield put(getAssetCatalog())
    yield put(selectAssetsTab({ tab: AssetsTab.CustomAssets }))
  } catch (e) {
    yield put(error({ error: ErrorType.CreateCustomAsset }))
  }
}
