import { PointerEventType, InputAction, Entity, PBPointerEventsResult } from '../../../packages/@dcl/ecs/src'

export function createTestPointerDownCommand(
  entity: Entity,
  timestamp: number,
  state: PointerEventType,
  button: InputAction = InputAction.IA_POINTER
): PBPointerEventsResult {
  return {
    button,
    timestamp: timestamp,
    hit: {
      position: { x: 1, y: 2, z: 3 },
      length: 10,
      direction: { x: 1, y: 2, z: 3 },
      normalHit: { x: 1, y: 2, z: 3 },
      globalOrigin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh',
      entityId: entity as number
    },
    state: state,
    analog: 5,
    tickNumber: 0
  }
}
