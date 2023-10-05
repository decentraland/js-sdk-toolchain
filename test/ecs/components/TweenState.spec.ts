import { Engine, TweenStateStatus, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated TweenStateState ProtoBuf', () => {
  it('should serialize/deserialize move TweenState', () => {
    const newEngine = Engine()
    const TweenState = components.TweenState(newEngine)

    testComponentSerialization(TweenState, {
      state: TweenStateStatus.TS_ACTIVE,
      currentTime: 8
    })

    testComponentSerialization(TweenState, {
      state: TweenStateStatus.TS_COMPLETED,
      currentTime: 0
    })
  })
})
