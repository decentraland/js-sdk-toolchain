import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PointerLock ProtoBuf', () => {
  it('should serialize/deserialize PointerLock', () => {
    const newEngine = Engine()
    const PointerLock = components.PointerLock(newEngine)

    testComponentSerialization(PointerLock, {
      isPointerLocked: true
    })

    testComponentSerialization(PointerLock, {
      isPointerLocked: false
    })
  })
})
