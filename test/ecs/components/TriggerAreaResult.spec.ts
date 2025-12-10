import { components, Engine, TriggerAreaEventType } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'
import { Quaternion, Vector3 } from '../../../packages/@dcl/sdk/math'

describe('Generated TriggerAreaResult ProtoBuf', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const TriggerAreaResult = components.TriggerAreaResult(newEngine)

    testSchemaSerializationIdentity(TriggerAreaResult.schema, {
      triggeredEntity: 1,
      triggeredEntityPosition: Vector3.create(1, 2, 3),
      triggeredEntityRotation: Quaternion.Identity(),
      eventType: TriggerAreaEventType.TAET_ENTER,
      timestamp: 10,
      trigger: {
        entity: 2,
        layers: 0,
        position: Vector3.create(4, 5, 6),
        rotation: Quaternion.Zero(),
        scale: Vector3.One()
      }
    })

    testSchemaSerializationIdentity(TriggerAreaResult.schema, {
      triggeredEntity: 5,
      triggeredEntityPosition: undefined,
      triggeredEntityRotation: undefined,
      eventType: TriggerAreaEventType.TAET_STAY,
      timestamp: 20,
      trigger: {
        entity: 3,
        layers: 1,
        position: undefined,
        rotation: undefined,
        scale: undefined
      }
    })

    testSchemaSerializationIdentity(TriggerAreaResult.schema, {
      triggeredEntity: 7,
      triggeredEntityPosition: Vector3.Zero(),
      triggeredEntityRotation: Quaternion.Zero(),
      eventType: TriggerAreaEventType.TAET_EXIT,
      timestamp: 30,
      trigger: {
        entity: 9,
        layers: 2,
        position: Vector3.One(),
        rotation: Quaternion.Identity(),
        scale: Vector3.create(2, 2, 2)
      }
    })

    testSchemaSerializationIdentity(TriggerAreaResult.schema, TriggerAreaResult.schema.create())
  })
})
