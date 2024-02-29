import * as BABYLON from '@babylonjs/core'
import { Keys, keyState } from './keys'
import { PARCEL_SIZE } from '../../utils/scene'
import mitt, { Emitter } from 'mitt'
import { EcsEntity } from './EcsEntity'
import { fitSphereIntoCameraFrustum } from '../../logic/math'
import { Vector3, Quaternion } from '@dcl/ecs-math'

type SpeedChangeEvent = { change: number }

enum SpeedIncrement {
  FASTER = 1,
  SLOWER = -1
}

type AnimationData = {
  startPos: Vector3
  endPos: Vector3
  startQuat: Quaternion
  endQuat: Quaternion
  timePassed: number
  duration: number
}

export class CameraManager {
  private static ANGULAR_SENSIBILITY = 500
  private speeds: Array<number>
  private speedIndex: number
  private minY: number
  private zoomSensitivity: number
  private camera: BABYLON.FreeCamera
  private speedChangeObservable: Emitter<SpeedChangeEvent>
  private getAspectRatio: () => number
  private animation: AnimationData | null

  constructor(
    scene: BABYLON.Scene,
    public inputSource: HTMLCanvasElement,
    speeds: Array<number>,
    initialSpeedIndex: number,
    minY: number,
    zoomSensitivity: number
  ) {
    this.speeds = speeds
    this.speedIndex = initialSpeedIndex
    this.minY = minY
    this.zoomSensitivity = zoomSensitivity
    this.speedChangeObservable = mitt<SpeedChangeEvent>()
    this.getAspectRatio = () => {
      return inputSource.width / inputSource.height
    }
    this.animation = null

    this.camera = this.createCamera(scene)
    scene.activeCamera?.detachControl()
    scene.activeCamera = this.camera
    scene.activeCamera.attachControl(inputSource, true)

    // There is a bug when holding RMB and moving out of the window
    // that prevents Babylon to release the button event
    // Seems to only occur under specific conditions (OSX + Chromium based browsers)
    // https://forum.babylonjs.com/t/camera-sticks-to-pointerdown-when-going-out-of-the-screen/20395
    //
    window.addEventListener('mouseout', () => this.reattachControl())
    inputSource.addEventListener('mouseout', () => this.reattachControl())
  }

  reattachControl() {
    this.camera.detachControl()
    this.camera.attachControl(this.inputSource, true)
  }

  getCamera() {
    return this.camera
  }

  getGlobalPosition() {
    return this.camera.globalPosition
  }

  getSpeed() {
    return this.speeds[this.speedIndex]
  }

  getSpeedChangeObservable() {
    return this.speedChangeObservable
  }

  setFreeCameraInvertRotation(invert: boolean) {
    const sign = invert ? -1 : 1
    this.camera.angularSensibility = sign * CameraManager.ANGULAR_SENSIBILITY
  }

  centerViewOnEntity(entity: EcsEntity) {
    // get a bounding sphere from bounding box
    const { min, max } = entity.getHierarchyBoundingVectors()
    let center: BABYLON.Vector3
    let radius: number
    // Babylon returns (MAX_VALUE, MAX_VALUE, MAX_VALUE), (MIN_VALUE, MIN_VALUE, MIN_VALUE) for empty nodes
    if (min.x === Number.MAX_VALUE) {
      center = entity.getWorldMatrix().getTranslation()
      radius = 1
    } else {
      center = min.add(max).scale(0.5)
      radius = max.subtract(center).length()
    }
    const position = fitSphereIntoCameraFrustum(
      this.camera.position,
      this.camera.fov,
      this.getAspectRatio(),
      this.camera.minZ,
      this.minY,
      center,
      radius
    )

    this.animation = {
      startPos: this.camera.position,
      endPos: position,
      startQuat: Quaternion.fromLookAt(this.camera.position, this.camera.target),
      endQuat: Quaternion.fromLookAt(position, center),
      duration: 0.2,
      timePassed: 0
    }
  }

  resetCamera() {
    const center = new BABYLON.Vector3(PARCEL_SIZE / 2, 0, PARCEL_SIZE / 2)
    const size = center.length()
    this.camera.position = center.subtractFromFloats(size, -size * 1.5, size * 2)
    this.camera.target = center
  }

  private createCamera(scene: BABYLON.Scene) {
    const center = new BABYLON.Vector3(PARCEL_SIZE / 2, 0, PARCEL_SIZE / 2)
    const size = center.length()
    const camera = new BABYLON.FreeCamera('editorCamera', center.subtractFromFloats(size, -size * 1.5, size * 2), scene)
    camera.target = center

    camera.inertia = 0
    camera.speed = this.speeds[this.speedIndex]
    camera.angularSensibility = CameraManager.ANGULAR_SENSIBILITY

    camera.keysDown = [Keys.KEY_S, Keys.KEY_DOWN]
    camera.keysUp = [Keys.KEY_W, Keys.KEY_UP]
    camera.keysLeft = [Keys.KEY_A, Keys.KEY_LEFT]
    camera.keysRight = [Keys.KEY_D, Keys.KEY_RIGHT]

    function isCameraMoving(): boolean {
      for (const key of camera.keysDown) if (keyState[key]) return true
      for (const key of camera.keysUp) if (keyState[key]) return true
      for (const key of camera.keysLeft) if (keyState[key]) return true
      for (const key of camera.keysRight) if (keyState[key]) return true
      return false
    }

    let holdingMouseButton = false
    scene.onPointerObservable.add((ev) => {
      if (ev.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        holdingMouseButton = true
      }
      if (ev.type === BABYLON.PointerEventTypes.POINTERUP) {
        holdingMouseButton = false
      }
      if (ev.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
        const browserEvent = ev.event as BABYLON.IWheelEvent

        if (holdingMouseButton || isCameraMoving()) {
          if (browserEvent.deltaY < 0) this.changeSpeed(SpeedIncrement.FASTER)
          else if (browserEvent.deltaY > 0) this.changeSpeed(SpeedIncrement.SLOWER)
        } else {
          const direction = camera.target.subtract(camera.position)
          direction.normalize().scaleInPlace(this.zoomSensitivity)
          if (browserEvent.deltaY > 0) direction.negateInPlace()
          camera.position.addInPlace(direction)
        }
      }
    })

    scene.registerBeforeRender(() => {
      this.onRenderFrame(scene)
    })
    return camera
  }

  private changeSpeed(increment: SpeedIncrement) {
    if (increment === SpeedIncrement.FASTER) {
      if (this.speedIndex < this.speeds.length - 1) this.speedIndex += 1
    } else {
      if (this.speedIndex > 0) this.speedIndex -= 1
    }
    this.camera.speed = this.speeds[this.speedIndex]
    this.speedChangeObservable.emit('change', this.camera.speed)
  }

  private onRenderFrame(scene: BABYLON.Scene) {
    if (this.animation !== null) {
      const dt = scene.getEngine().getDeltaTime()
      this.animation.timePassed += dt / 1000
      this.animation.timePassed = Math.min(this.animation.duration, this.animation.timePassed)
      const t = this.animation.timePassed / this.animation.duration

      const position = Vector3.lerp(this.animation.startPos, this.animation.endPos, t)
      this.camera.position = new BABYLON.Vector3(position.x, position.y, position.z)

      const quat = Quaternion.slerp(this.animation.startQuat, this.animation.endQuat, t)
      const direction = Vector3.rotate(Vector3.create(0, 0, 1), quat)
      this.camera.target = this.camera.position.add(new BABYLON.Vector3(direction.x, direction.y, direction.z))

      if (this.animation.timePassed >= this.animation.duration) this.animation = null
    }

    if (this.camera.position.y <= this.minY) {
      this.camera.position.y = this.minY
    }
  }
}
