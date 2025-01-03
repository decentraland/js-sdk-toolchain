import { PayloadAction } from '@reduxjs/toolkit'
import { expectSaga } from 'redux-saga-test-plan'
import { call, select } from 'redux-saga-test-plan/matchers'
import { getAssetCatalog, getDataLayerInterface, IDataLayer } from '..'
import { error } from '../index'
import { ErrorType } from '../index'
import { renameCustomAssetSaga } from './rename-custom-asset'

describe('renameCustomAssetSaga', () => {
  const mockAction: PayloadAction<{ assetId: string; newName: string }> = {
    type: 'renameCustomAsset',
    payload: { assetId: 'test-asset-id', newName: 'New Asset Name' }
  }

  const mockDataLayer: Partial<IDataLayer> = {
    renameCustomAsset: jest.fn()
  }

  it('should rename custom asset and get asset catalog', () => {
    return expectSaga(renameCustomAssetSaga, mockAction)
      .provide([
        [select(getDataLayerInterface), mockDataLayer],
        [call([mockDataLayer, 'renameCustomAsset'], { assetId: 'test-asset-id', newName: 'New Asset Name' }), undefined]
      ])
      .put(getAssetCatalog())
      .run()
  })

  it('should handle error when renaming custom asset', () => {
    const testError = new Error('Test error')
    return expectSaga(renameCustomAssetSaga, mockAction)
      .provide([
        [select(getDataLayerInterface), mockDataLayer],
        [
          call([mockDataLayer, 'renameCustomAsset'], { assetId: 'test-asset-id', newName: 'New Asset Name' }),
          Promise.reject(testError)
        ]
      ])
      .put(error({ error: ErrorType.RenameCustomAsset }))
      .run()
  })

  it('should do nothing if data layer is not available', () => {
    return expectSaga(renameCustomAssetSaga, mockAction)
      .provide([[select(getDataLayerInterface), null]])
      .run()
  })
})
