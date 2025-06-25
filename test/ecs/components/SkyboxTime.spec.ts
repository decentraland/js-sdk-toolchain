import { engine, components, TransitionMode } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated SkyboxTime ProtoBuf', () => {
  it('should serialize/deserialize SkyboxTime', () => {
    const skyboxTime = components.SkyboxTime(engine)

    testComponentSerialization(skyboxTime, {
      fixedTimeOfDay: 0,
      transitionMode: TransitionMode.TM_FORWARD
    })
  })
})
