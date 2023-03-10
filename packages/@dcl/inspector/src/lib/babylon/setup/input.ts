import * as BABYLON from '@babylonjs/core'
import { EcsEntity } from '../decentraland/EcsEntity'

/**
 * This is a map of keys (see enum Keys): boolean
 */
const keyState: {
  [keyCode: number]: boolean
  [keyName: string]: boolean
} = {}

enum Keys {
  KEY_W = 87,
  KEY_A = 65,
  KEY_F = 70,
  KEY_S = 83,
  KEY_D = 68,

  KEY_LEFT = 37,
  KEY_UP = 38,
  KEY_RIGHT = 39,
  KEY_DOWN = 40,

  KEY_SHIFT = -1,
  KEY_CTRL = -2,
  KEY_SPACE = 32,

  KEY_E = 69,
  KEY_Q = 81
}

/// --- EXPORTS ---

export { keyState, Keys }

export function initKeyboard(scene: BABYLON.Scene, camera: BABYLON.ArcRotateCamera) {
  document.body.addEventListener('keydown', (e) => {
    keyState[Keys.KEY_SHIFT] = e.shiftKey
    keyState[Keys.KEY_CTRL] = e.ctrlKey
    keyState[e.keyCode] = true
  })

  document.body.addEventListener('keyup', (e) => {
    // if (!e.shiftKey) {
    //   firstPersonCamera.speed = playerConfigurations.speed
    // }

    keyState[Keys.KEY_SHIFT] = e.shiftKey
    keyState[Keys.KEY_CTRL] = e.ctrlKey
    keyState[e.keyCode] = false
  })

  const CAMERA_SPEED = 0.01
  const CAMERA_LEFT = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI / 2, 0, 0)
  const CAMERA_RIGHT = BABYLON.Quaternion.RotationYawPitchRoll(-Math.PI / 2, 0, 0)
  const CAMERA_FORWARD = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI, 0, 0)
  const CAMERA_BACKWARD = BABYLON.Quaternion.RotationYawPitchRoll(0, 0, 0)

  camera.keysDown = []
  camera.keysUp = []
  camera.keysLeft = []
  camera.keysRight = []

  camera.onAfterCheckInputsObservable.add(() => {
    if (camera === scene.activeCamera) {
      if (keyState[Keys.KEY_LEFT] || keyState[Keys.KEY_A]) {
        camera.target.addInPlace(moveCamera(camera, CAMERA_LEFT, CAMERA_SPEED * scene.getEngine().getDeltaTime()))
      }

      if (keyState[Keys.KEY_RIGHT] || keyState[Keys.KEY_D]) {
        camera.target.addInPlace(moveCamera(camera, CAMERA_RIGHT, CAMERA_SPEED * scene.getEngine().getDeltaTime()))
      }

      if (keyState[Keys.KEY_UP] || keyState[Keys.KEY_W]) {
        camera.target.addInPlace(moveCamera(camera, CAMERA_FORWARD, CAMERA_SPEED * scene.getEngine().getDeltaTime()))
      }

      if (keyState[Keys.KEY_DOWN] || keyState[Keys.KEY_S]) {
        camera.target.addInPlace(moveCamera(camera, CAMERA_BACKWARD, CAMERA_SPEED * scene.getEngine().getDeltaTime()))
      }
    }
  })

  scene.onPointerObservable.add((e) => {
    if (e.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      const evt = e.event as PointerEvent
      scene.getEngine().getRenderingCanvas()!.focus()
      interactWithScene(scene, 'pointerDown', evt.offsetX, evt.offsetY, evt.pointerId)
    } else if (e.type === BABYLON.PointerEventTypes.POINTERUP) {
      const evt = e.event as PointerEvent

      interactWithScene(scene, 'pointerUp', evt.offsetX, evt.offsetY, evt.pointerId)
    }
  })
}

function moveCamera(camera: BABYLON.ArcRotateCamera, directionRotation: BABYLON.Quaternion, speed: number) {
  const direction = camera.position.subtract(camera.target)
  direction.y = 0
  direction.normalize()

  applyQuaternion(direction, directionRotation)
  return direction.scaleInPlace(speed)
}

function applyQuaternion(v: BABYLON.Vector3, q: BABYLON.Quaternion) {
  const x = v.x
  const y = v.y
  const z = v.z
  const qx = q.x
  const qy = q.y
  const qz = q.z
  const qw = q.w

  // calculate quat * vector

  const ix = qw * x + qy * z - qz * y
  const iy = qw * y + qz * x - qx * z
  const iz = qw * z + qx * y - qy * x
  const iw = -qx * x - qy * y - qz * z

  // calculate result * inverse quat

  v.x = ix * qw + iw * -qx + iy * -qz - iz * -qy
  v.y = iy * qw + iw * -qy + iz * -qx - ix * -qz
  v.z = iz * qw + iw * -qz + ix * -qy - iy * -qx

  return v
}

function isEcsEntity(x: any): x is EcsEntity {
  return 'isDCLEntity' in x
}

function findParentEntity<T extends BABYLON.Node & { isDCLEntity?: boolean }>(node: T): EcsEntity | null {
  // Find the next entity parent to dispatch the event
  let parent: BABYLON.Node | null = node.parent

  while (parent && !isEcsEntity(parent)) {
    parent = parent.parent

    // If the element has no parent, stop execution
    if (!parent) return null
  }

  return (parent as any) || null
}

export function interactWithScene(
  scene: BABYLON.Scene,
  pointerEvent: 'pointerUp' | 'pointerDown',
  x: number,
  y: number,
  _pointerId: number
) {
  const pickingResult = scene.pick(x, y, void 0, false)

  const mesh = pickingResult!.pickedMesh

  const entity = mesh && findParentEntity(mesh)

  if (entity && pointerEvent === 'pointerDown') {
    const context = entity.context.deref()!

    // clean selection
    const { EntitySelected } = context.editorComponents
    for (const [e] of context.engine.getEntitiesWith(EntitySelected)) {
      if (e !== entity.entityId) {
        EntitySelected.deleteFrom(e)
      }
    }

    // then select new
    if (entity.entityId) {
      if (!EntitySelected.has(entity.entityId)) {
        EntitySelected.createOrReplace(entity.entityId, { gizmo: 0 })
      }
      const mut = EntitySelected.getMutable(entity.entityId)
      mut.gizmo++
      mut.gizmo %= 3
    }
  }
}
