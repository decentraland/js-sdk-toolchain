import { Engine, components, BillboardMode } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Billboard ProtoBuf', () => {
  it('should serialize/deserialize Billboard', () => {
    const newEngine = Engine()
    const Billboard = components.Billboard(newEngine)

    testComponentSerialization(Billboard, {
      billboardMode: BillboardMode.BM_Y
    })
  })
})
