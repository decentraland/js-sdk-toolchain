import { components, Engine, TriggerAreaMeshType } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization, testSchemaSerializationIdentity } from './assertion'

describe('Generated TriggerArea ProtoBuf', () => {
  it('should serialize via component create/replace', () => {
    const newEngine = Engine()
    const TriggerArea = components.TriggerArea(newEngine)

    testComponentSerialization(TriggerArea, {
      mesh: TriggerAreaMeshType.TAMT_BOX,
      collisionMask: 0
    })

    testComponentSerialization(TriggerArea, {
      mesh: TriggerAreaMeshType.TAMT_SPHERE,
      collisionMask: 3
    })
  })

  it('should serialize schema default create', () => {
    const newEngine = Engine()
    const TriggerArea = components.TriggerArea(newEngine)
    testSchemaSerializationIdentity(TriggerArea.schema, TriggerArea.schema.create())
  })
})
