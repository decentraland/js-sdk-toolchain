import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('MainCamera component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    testComponentSerialization(components.MainCamera(newEngine), {
      virtualCameraEntity: 53
    })
  })
})
