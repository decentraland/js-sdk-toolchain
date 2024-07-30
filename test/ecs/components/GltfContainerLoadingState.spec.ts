﻿import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated GltfContainerLoadingState ProtoBuf', () => {
  it('should serialize/deserialize GltfContainerLoadingState', () => {
    const newEngine = Engine()
    const GltfContainerLoadingState = components.GltfContainerLoadingState(newEngine)

    testComponentSerialization(GltfContainerLoadingState, {
      currentState: 1,
      nodePaths: [],
      meshNames: [],
      skinNames: [],
      materialNames: [],
      animationNames: []
    })
  })
})
