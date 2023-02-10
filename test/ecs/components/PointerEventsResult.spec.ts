import { Engine, components, InputAction, PointerEventType } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PointerEventsResult ProtoBuf', () => {
  it('should serialize/deserialize PointerEventsResult', () => {
    const newEngine = Engine()
    const PointerEventsResult = components.PointerEventsResult(newEngine)
    testComponentSerialization(PointerEventsResult, {
      commands: [
        {
          button: InputAction.IA_ACTION_3,
          timestamp: 5,
          hit: {
            position: { x: 1, y: 2, z: 3 },
            length: 10,
            direction: { x: 1, y: 2, z: 3 },
            normalHit: { x: 1, y: 2, z: 3 },
            origin: { x: 1, y: 2, z: 3 },
            meshName: 'mesh',
            entityId: 515
          },
          state: PointerEventType.PET_DOWN,
          analog: 5
        }
      ]
    })

    testComponentSerialization(PointerEventsResult, {
      commands: [
        {
          button: InputAction.IA_ACTION_5,
          timestamp: 15,
          hit: {
            position: { x: 3, y: 4, z: 5 },
            length: 15,
            direction: { x: 3, y: 4, z: 5 },
            normalHit: { x: 3, y: 4, z: 5 },
            origin: { x: 3, y: 4, z: 5 },
            meshName: 'meshNew',
            entityId: 5154
          },
          state: PointerEventType.PET_UP,
          analog: 55
        },
        {
          button: InputAction.IA_ACTION_5,
          timestamp: 15,
          hit: {
            position: { x: 3, y: 4, z: 5 },
            length: 15,
            entityId: undefined,
            direction: { x: 3, y: 4, z: 5 },
            normalHit: { x: 3, y: 4, z: 5 },
            origin: { x: 3, y: 4, z: 5 },
            meshName: 'meshNew'
          },
          state: PointerEventType.PET_UP,
          analog: 523
        }
      ]
    })
  })
})
