import * as BABYLON from '@babylonjs/core'
import { Keys, keyState } from './keys'
import { PARCEL_SIZE } from '../../utils/scene'
import mitt, { Emitter } from 'mitt'

type SpeedChangeEvent = { change: number }

enum SpeedIncrement {
  FASTER = 1,
  SLOWER = -1
}

export class CameraManager {
  private speeds: Array<number>
  private speedIndex: number
  private minY: number
  private zoomSensitivity: number
  private camera: BABYLON.TargetCamera
  private speedChangeObservable: Emitter<SpeedChangeEvent>

  constructor(scene: BABYLON.Scene, inputSource: HTMLElement, speeds: Array<number>, initialSpeedIndex: number, minY: number, zoomSensitivity: number) {
    this.speeds = speeds
    this.speedIndex = initialSpeedIndex
    this.minY = minY
    this.zoomSensitivity = zoomSensitivity
    this.camera = this.createCamera(scene)
    this.speedChangeObservable = mitt<SpeedChangeEvent>()

    scene.activeCamera?.detachControl()
    scene.activeCamera = this.camera
    scene.activeCamera.attachControl(inputSource, true)
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

  private createCamera(scene: BABYLON.Scene) {
    const center = new BABYLON.Vector3(PARCEL_SIZE / 2, 0, PARCEL_SIZE / 2)
    const size = center.length()
    const camera = new BABYLON.FreeCamera('editorCamera', center.subtractFromFloats(size, -size * 1.5, size * 2))
    camera.target = center

    camera.inertia = 0
    camera.speed = this.speeds[this.speedIndex]
    camera.angularSensibility = 500

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
      if (camera.position.y <= this.minY) {
        camera.position.y = this.minY
      }
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
}
