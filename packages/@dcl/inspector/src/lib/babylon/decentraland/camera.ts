import * as BABYLON from '@babylonjs/core'
import { Keys, keyState } from './keys'
import { PARCEL_SIZE } from '../../utils/scene'
import mitt, { Emitter } from 'mitt'

type SpeedChangeEvent = {change: number}

let SPEEDS = [...Array(20).keys()].map((_, i) => { return i + 1 })
SPEEDS = SPEEDS.concat([30, 40, 50, 60, 70, 80, 90, 100])

enum SpeedIncrement {
  FASTER = 1,
  SLOWER = -1
}

export class CameraManager {
  private speedIndex: number
  private camera: BABYLON.TargetCamera
  private speedChangeObservable: Emitter<SpeedChangeEvent>

  constructor(scene: BABYLON.Scene) {
    this.speedIndex = 10
    this.camera = this.createCamera(scene)
    this.speedChangeObservable = mitt<SpeedChangeEvent>()
  }

  getCamera() {
    return this.camera
  }

  getSpeed() {
    return SPEEDS[this.speedIndex]
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
    camera.speed = SPEEDS[this.speedIndex]
    camera.angularSensibility = 500

    camera.keysDown = [Keys.KEY_S, Keys.KEY_DOWN]
    camera.keysUp = [Keys.KEY_W, Keys.KEY_UP]
    camera.keysLeft = [Keys.KEY_A, Keys.KEY_LEFT]
    camera.keysRight = [Keys.KEY_D, Keys.KEY_RIGHT]

    function isCameraMoving(): boolean {
      for (let key of camera.keysDown)
        if (keyState[key]) return true
      for (let key of camera.keysUp)
        if (keyState[key]) return true
      for (let key of camera.keysLeft)
        if (keyState[key]) return true
      for (let key of camera.keysRight)
        if (keyState[key]) return true
      return false
    }

    let holdingMouseButton = false
    scene.onPointerObservable.add((ev) => {
      if (ev.type == BABYLON.PointerEventTypes.POINTERDOWN) {
        holdingMouseButton = true
      }
      if (ev.type == BABYLON.PointerEventTypes.POINTERUP) {
        holdingMouseButton = false
      }
      if (ev.type == BABYLON.PointerEventTypes.POINTERWHEEL) {
        const browserEvent = ev.event as BABYLON.IWheelEvent

        if (holdingMouseButton || isCameraMoving()) {
          if (browserEvent.deltaY < 0)
            this.changeSpeed(SpeedIncrement.FASTER)
          else if (browserEvent.deltaY > 0)
            this.changeSpeed(SpeedIncrement.SLOWER)
        } else {
          const direction = camera.target.subtract(camera.position)
          direction.normalize().scaleInPlace(5)
          if (browserEvent.deltaY > 0)
            direction.negateInPlace()
          camera.position.addInPlace(direction)
        }
      }
    })
    return camera
  }

  private changeSpeed(increment: SpeedIncrement) {
    if (increment == SpeedIncrement.FASTER) {
      if (this.speedIndex < SPEEDS.length - 1)
        this.speedIndex += 1
    } else {
      if (this.speedIndex > 0)
        this.speedIndex -= 1
    }
    this.camera.speed = SPEEDS[this.speedIndex]
    this.speedChangeObservable.emit('change', this.camera.speed)
  }
}

