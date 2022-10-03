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
    eventType: PointerEventType.DOWN,
    eventInfo: {
      button: ActionButton.PRIMARY,
      hoverText: 'PrimaryDown',
      maxDistance: 5,
      showFeedback: true
    }
  }
])

createCube(13, 1, 15, [
  {
    eventType: PointerEventType.UP,
    eventInfo: {
      button: ActionButton.SECONDARY,
      hoverText: 'Secondary Up',
      maxDistance: 5,
      showFeedback: true
    }
  }
])

createCube(11, 1, 15, [
  {
    eventType: PointerEventType.HOVER_ENTER,
    eventInfo: {
      button: ActionButton.ANY,
      hoverText: 'Infinity Hover',
      maxDistance: 10000000,
      showFeedback: true
    }
  }
])
