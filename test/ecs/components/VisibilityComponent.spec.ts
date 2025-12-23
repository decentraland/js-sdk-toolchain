import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated VisibilityComponent ProtoBuf', () => {
  it('should serialize/deserialize VisibilityComponent', () => {
    const newEngine = Engine()
    const VisibilityComponent = components.VisibilityComponent(newEngine)

    testComponentSerialization(VisibilityComponent, { visible: true, propagateToChildren: false })
    testComponentSerialization(VisibilityComponent, { visible: false, propagateToChildren: true })
  })
})
