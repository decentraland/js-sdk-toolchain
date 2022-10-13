// Cube factory
function createCube(
  x: number,
  y: number,
  z: number,
  pointerEvents: PBPointerEvents_Entry[]
): Entity {
  const meshEntity = engine.addEntity()
  Transform.create(meshEntity, { position: { x, y, z } })
  MeshRenderer.create(meshEntity, { box: { uvs: [] } })
  MeshCollider.create(meshEntity, { box: {} })
  PointerEvents.create(meshEntity, { pointerEvents })
  return meshEntity
}

createCube(15, 1, 15, [
  {
    eventType: PointerEventType.PET_DOWN,
    eventInfo: {
      button: InputAction.IA_PRIMARY,
      hoverText: 'PrimaryDown',
      maxDistance: 5,
      showFeedback: true
    }
  }
])

createCube(13, 1, 15, [
  {
    eventType: PointerEventType.PET_UP,
    eventInfo: {
      button: InputAction.IA_SECONDARY,
      hoverText: 'Secondary Up',
      maxDistance: 5,
      showFeedback: true
    }
  }
])

createCube(11, 1, 15, [
  {
    eventType: PointerEventType.PET_HOVER_ENTER,
    eventInfo: {
      button: InputAction.IA_ANY,
      hoverText: 'Infinity Hover',
      maxDistance: 10000000,
      showFeedback: true
    }
  }
])
