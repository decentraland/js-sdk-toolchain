import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated EngineInfo ProtoBuf', () => {
  it('should serialize/deserialize EngineInfo', () => {
    const newEngine = Engine()
    const EngineInfo = components.EngineInfo(newEngine)

    testComponentSerialization(EngineInfo, {
      frameNumber: 0,
      tickNumber: 0,
      totalRuntime: 0
    })
  })
})
