import { PayloadAction } from '@reduxjs/toolkit'
import { expectSaga } from 'redux-saga-test-plan'
import { call } from 'redux-saga-test-plan/matchers'
import { throwError } from 'redux-saga-test-plan/providers'
import { createCustomAssetSaga } from './create-custom-asset'
import { error, getAssetCatalog, getDataLayerInterface } from '..'
import { ErrorType } from '../index'
import { selectAssetsTab } from '../../ui'
import { AssetsTab } from '../../ui/types'
import { getResourcesFromModels } from '../../../lib/babylon/decentraland/get-resources'
import { transformBase64ResourceToBinary } from '../../../lib/data-layer/host/fs-utils'
import { analytics, Event } from '../../../lib/logic/analytics'

describe('createCustomAssetSaga', () => {
  const mockPayload = {
    name: 'Test Asset',
    composite: { version: 1, components: [] },
    resources: ['model.gltf', 'texture.png'],
    thumbnail: 'base64...'
  }

  const mockAction: PayloadAction<typeof mockPayload> = {
    type: 'CREATE_CUSTOM_ASSET',
    payload: mockPayload
  }

  const mockDataLayer = {
    createCustomAsset: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully create a custom asset', async () => {
    const mockResourcesFromModels = ['texture1.png', 'texture2.png']
    const gltfResources = mockPayload.resources.filter((r) => r.endsWith('.gltf') || r.endsWith('.glb'))
    const mockAsset = {
      id: 'test-id',
      name: mockPayload.name,
      composite: mockPayload.composite,
      resources: [...mockPayload.resources, ...mockResourcesFromModels]
    }

    return expectSaga(createCustomAssetSaga, mockAction)
      .provide([
        [call(getDataLayerInterface), mockDataLayer],
        [call(getResourcesFromModels, gltfResources), mockResourcesFromModels],
        [
          call([mockDataLayer, 'createCustomAsset'], {
            name: mockPayload.name,
            composite: Buffer.from(JSON.stringify(mockPayload.composite)),
            resources: [...mockPayload.resources, ...mockResourcesFromModels],
            thumbnail: transformBase64ResourceToBinary(mockPayload.thumbnail)
          }),
          { asset: { data: Buffer.from(JSON.stringify(mockAsset)) } }
        ],
        [
          call([analytics, 'track'], Event.CREATE_CUSTOM_ITEM, {
            itemId: mockAsset.id,
            itemName: mockPayload.name,
            resourceCount: [...mockPayload.resources, ...mockResourcesFromModels].length,
            isSmart: false
          }),
          undefined
        ]
      ])
      .put(getAssetCatalog())
      .put(selectAssetsTab({ tab: AssetsTab.CustomAssets }))
      .run()
  })

  it('should handle case without thumbnail', async () => {
    const payloadWithoutThumbnail = { ...mockPayload, thumbnail: undefined }
    const actionWithoutThumbnail = { ...mockAction, payload: payloadWithoutThumbnail }
    const gltfResources = payloadWithoutThumbnail.resources.filter((r) => r.endsWith('.gltf') || r.endsWith('.glb'))
    const mockAsset = {
      id: 'test-id',
      name: payloadWithoutThumbnail.name,
      composite: payloadWithoutThumbnail.composite,
      resources: payloadWithoutThumbnail.resources
    }

    return expectSaga(createCustomAssetSaga, actionWithoutThumbnail)
      .provide([
        [call(getDataLayerInterface), mockDataLayer],
        [call(getResourcesFromModels, gltfResources), []],
        [
          call([mockDataLayer, 'createCustomAsset'], {
            name: payloadWithoutThumbnail.name,
            composite: Buffer.from(JSON.stringify(payloadWithoutThumbnail.composite)),
            resources: payloadWithoutThumbnail.resources,
            thumbnail: undefined
          }),
          { asset: { data: Buffer.from(JSON.stringify(mockAsset)) } }
        ],
        [
          call([analytics, 'track'], Event.CREATE_CUSTOM_ITEM, {
            itemId: mockAsset.id,
            itemName: payloadWithoutThumbnail.name,
            resourceCount: payloadWithoutThumbnail.resources.length,
            isSmart: false
          }),
          undefined
        ]
      ])
      .put(getAssetCatalog())
      .put(selectAssetsTab({ tab: AssetsTab.CustomAssets }))
      .run()
  })

  it('should handle errors', async () => {
    const error$ = new Error('Failed to create asset')
    const gltfResources = mockPayload.resources.filter((r) => r.endsWith('.gltf') || r.endsWith('.glb'))

    return expectSaga(createCustomAssetSaga, mockAction)
      .provide([
        [call(getDataLayerInterface), mockDataLayer],
        [call(getResourcesFromModels, gltfResources), throwError(error$)]
      ])
      .put(error({ error: ErrorType.CreateCustomAsset }))
      .run()
  })

  it('should do nothing if dataLayer is not available', async () => {
    return expectSaga(createCustomAssetSaga, mockAction)
      .provide([[call(getDataLayerInterface), null]])
      .not.put(getAssetCatalog())
      .not.put(selectAssetsTab({ tab: AssetsTab.CustomAssets }))
      .run()
  })
})
