import {
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  PointerEvents,
  PointerEventType,
  InputAction,
  engine,
  inputSystem,
  TextShape,
  AvatarAttach,
  Schemas,
  ColliderLayer
} from '@dcl/ecs'
import { Color4 } from '@dcl/sdk/math'
import { parentEntity, syncEntity, getFirstChild, getParent, myProfile } from '@dcl/sdk/network'

const Grabbed = engine.defineComponent('grabbed', { userId: Schemas.String })

// Cube factory
export const Cube = engine.defineComponent('cube', {})
export function createTriangle(x: number, y: number, z: number, sync: boolean = true) {
  const entity = createCube(x, y, z, sync)
  MeshRenderer.setCylinder(entity, 1, 0)
  return entity
}

export function createCircle(x: number, y: number, z: number, sync: boolean = true) {
  const entity = createCube(x, y, z, sync)
  MeshRenderer.setCylinder(entity, 1, 1)
  return entity
}

export function createCube(x: number, y: number, z: number, sync: boolean = true, syncId?: number): Entity {
  const entity = engine.addEntity()
  // Used to track the cubes
  Cube.create(entity)

  Transform.create(entity, { position: { x, y, z } })

  Material.onChange(entity, (value) => {
    console.log('[Material has changed]', { entity, value })
  })

  // set how the cube looks and collides
  MeshRenderer.setBox(entity)
  MeshCollider.setBox(entity)
  const collider = MeshCollider.getMutable(entity)
  collider.collisionMask = ColliderLayer.CL_POINTER
  if (sync) {
    syncEntity(
      entity,
      [Material.componentId, AvatarAttach.componentId, Transform.componentId, Grabbed.componentId],
      syncId
    )
  }

  PointerEvents.create(entity, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: { button: InputAction.IA_POINTER, hoverText: 'Change Color' }
      },
      { eventType: PointerEventType.PET_DOWN, eventInfo: { button: InputAction.IA_PRIMARY, hoverText: 'Grab Cube' } },
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: { button: InputAction.IA_SECONDARY, hoverText: 'Remove Cube' }
      }
    ]
  })

  // create position text
  const positionText = engine.addEntity()

  Transform.create(positionText, { position: { x: 0, y: 1.5, z: 0 } })
  TextShape.create(positionText, { text: `${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}` })
  if (sync) {
    syncEntity(positionText, [Transform.componentId, TextShape.componentId])
    parentEntity(positionText, entity)
  } else {
    Transform.getMutable(positionText).parent = entity
  }

  // create entity text
  const entityText = engine.addEntity()
  Transform.create(entityText, { position: { x: 0, y: 1.5, z: 0 } })
  TextShape.create(entityText, { text: `-`, textColor: Color4.Blue() })
  EntityText.create(entityText)
  if (sync) {
    syncEntity(entityText, [Transform.componentId])
    parentEntity(entityText, positionText)
  } else {
    Transform.getMutable(entityText).parent = positionText
  }

  return entity
}
const EntityText = engine.defineComponent('entity-text', {})
engine.addSystem(() => {
  for (const [entity, _, textShape] of engine.getEntitiesWith(EntityText, TextShape)) {
    const positionTextEntity = getParent(entity) || Transform.get(entity).parent!
    const parentEntity = getParent(positionTextEntity) || Transform.get(positionTextEntity).parent
    const text = `Entities used: [${parentEntity}, ${positionTextEntity}, ${entity}]`
    if (textShape.text !== text) {
      TextShape.getMutable(entity).text = text
    }
  }
})

export function getRandomHexColor(): string {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

export function cubeSystem() {
  for (const [entity] of engine.getEntitiesWith(Cube, PointerEvents)) {
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) {
      Material.setPbrMaterial(entity, { albedoColor: Color4.fromHexString(getRandomHexColor()) })
    }
    if (inputSystem.isTriggered(InputAction.IA_SECONDARY, PointerEventType.PET_DOWN, entity)) {
      engine.removeEntityWithChildren(entity)
    }
    if (inputSystem.isTriggered(InputAction.IA_PRIMARY, PointerEventType.PET_DOWN, entity)) {
      console.log(Grabbed.getOrNull(entity))
      Grabbed.createOrReplace(entity, { userId: myProfile.userId })
    }
  }
  for (const [entity, grabbed] of engine.getEntitiesWith(Grabbed)) {
    if (grabbed.userId === myProfile.userId) {
      if (inputSystem.isTriggered(InputAction.IA_JUMP, PointerEventType.PET_DOWN)) {
        Grabbed.deleteFrom(entity)
        continue
      }
      const { x, y, z } = Transform.get(engine.PlayerEntity).position
      if (JSON.stringify(Transform.get(entity).position) === JSON.stringify({ x, y, z })) {
        continue
      }
      Transform.getMutable(entity).position = { x, y, z }
      const textEntity = getFirstChild(entity)!
      TextShape.getMutable(textEntity).text = `${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`
    }
  }
  return
}
