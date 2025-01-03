import { PayloadAction } from '@reduxjs/toolkit'
import { expectSaga } from 'redux-saga-test-plan'
import { call, select } from 'redux-saga-test-plan/matchers'
import { getAssetCatalog, getDataLayerInterface, IDataLayer } from '..'
import { error } from '../index'
import { ErrorType } from '../index'
import { deleteCustomAssetSaga } from './delete-custom-asset'

describe('deleteCustomAssetSaga', () => {
  const mockAction: PayloadAction<{ assetId: string }> = {
    type: 'deleteCustomAsset',
    payload: { assetId: 'test-asset-id' }
  }

  const mockDataLayer: Partial<IDataLayer> = {
    deleteCustomAsset: jest.fn()
  }

  it('should delete custom asset and get asset catalog', () => {
    return expectSaga(deleteCustomAssetSaga, mockAction)
      .provide([
        [select(getDataLayerInterface), mockDataLayer],
        [call([mockDataLayer, 'deleteCustomAsset'], { assetId: 'test-asset-id' }), undefined]
      ])
      .put(getAssetCatalog())
      .run()
  })

  it('should handle error when deleting custom asset', () => {
    const testError = new Error('Test error')
    return expectSaga(deleteCustomAssetSaga, mockAction)
      .provide([
        [select(getDataLayerInterface), mockDataLayer],
        [call([mockDataLayer, 'deleteCustomAsset'], { assetId: 'test-asset-id' }), Promise.reject(testError)]
      ])
      .put(error({ error: ErrorType.DeleteCustomAsset }))
      .run()
  })

  it('should do nothing if data layer is not available', () => {
    return expectSaga(deleteCustomAssetSaga, mockAction)
      .provide([[select(getDataLayerInterface), null]])
      .run()
  })
})
