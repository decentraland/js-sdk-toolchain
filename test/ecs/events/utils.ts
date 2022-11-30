import {
  PointerEventType,
  InputAction,
  Entity
} from '../../../packages/@dcl/ecs/src'

export function createTestPointerDownCommand(
  entity: Entity,
  timestamp: number,
  state: PointerEventType,
  button: InputAction = InputAction.IA_POINTER
) {
  return {
    button,
    timestamp: timestamp,
    hit: {
      position: { x: 1, y: 2, z: 3 },
      length: 10,
      direction: { x: 1, y: 2, z: 3 },
      normalHit: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh',
      entityId: entity as number
    },
    state: state,
    analog: 5
  }
}
