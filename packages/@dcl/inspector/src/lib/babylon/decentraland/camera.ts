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
  private mouseInput: CameraMouseInput

  constructor(
    scene: BABYLON.Scene,
    inputSource: HTMLElement,
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
    this.mouseInput = new CameraMouseInput()

    this.camera = this.createCamera(scene)
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

  getInvertXAxis() {
    return this.mouseInput.getInvertXAxis()
  }

  setInvertXAxis(invert: boolean) {
    this.mouseInput.setInvertXAxis(invert)
  }

  getInvertYAxis() {
    return this.mouseInput.getInvertYAxis()
  }

  setInvertYAxis(invert: boolean) {
    this.mouseInput.setInvertYAxis(invert)
  }

  private createCamera(scene: BABYLON.Scene) {
    const center = new BABYLON.Vector3(PARCEL_SIZE / 2, 0, PARCEL_SIZE / 2)
    const size = center.length()
    const camera = new BABYLON.FreeCamera('editorCamera', center.subtractFromFloats(size, -size * 1.5, size * 2))
    camera.target = center

    camera.inputs.removeMouse()
    camera.inputs.add(this.mouseInput)

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

class CameraMouseInput extends BABYLON.FreeCameraMouseInput {
  private invertXAxis = 1
  private invertYAxis = 1

  public getInvertXAxis() {
    return this.invertXAxis === -1
  }

  public setInvertXAxis(invert: boolean) {
    this.invertXAxis = invert ? -1 : 1
  }

  public getInvertYAxis() {
    return this.invertYAxis === -1
  }

  public setInvertYAxis(invert: boolean) {
    this.invertYAxis = invert ? -1 : 1
  }

  public attachControl(noPreventDefault?: boolean): void {
    // eslint-disable-next-line prefer-rest-params
    noPreventDefault = BABYLON.Tools.BackCompatCameraNoPreventDefault(arguments)
    const engine = this.camera.getEngine()
    const element = engine.getInputElement()

    if (!this['_pointerInput']) {
      this['_pointerInput'] = (p: any) => {
        const evt = <BABYLON.IPointerEvent>p.event
        const isTouch = evt.pointerType === 'touch'

        if (engine.isInVRExclusivePointerMode) {
          return
        }

        if (!this.touchEnabled && isTouch) {
          return
        }

        if (p.type !== BABYLON.PointerEventTypes.POINTERMOVE && this.buttons.indexOf(evt.button) === -1) {
          return
        }

        const srcElement = <HTMLElement>evt.target

        if (p.type === BABYLON.PointerEventTypes.POINTERDOWN) {
          // If the input is touch with more than one touch OR if the input is mouse and there is already an active button, return
          if ((isTouch && this['_activePointerId'] !== -1) || (!isTouch && this['_currentActiveButton'] !== -1)) {
            return
          }

          this['_activePointerId'] = evt.pointerId
          try {
            srcElement?.setPointerCapture(evt.pointerId)
          } catch (e) {
            //Nothing to do with the error. Execution will continue.
          }

          if (this['_currentActiveButton'] === -1) {
            this['_currentActiveButton'] = evt.button
          }

          this['_previousPosition'] = {
            x: evt.clientX,
            y: evt.clientY
          }

          if (!noPreventDefault) {
            evt.preventDefault()
            element && element.focus()
          }

          // This is required to move while pointer button is down
          if (engine.isPointerLock && this['_onMouseMove']) {
            this['_onMouseMove'](p.event)
          }
        } else if (p.type === BABYLON.PointerEventTypes.POINTERUP) {
          // If input is touch with a different touch id OR if input is mouse with a different button, return
          if (
            (isTouch && this['_activePointerId'] !== evt.pointerId) ||
            (!isTouch && this['_currentActiveButton'] !== evt.button)
          ) {
            return
          }

          try {
            srcElement?.releasePointerCapture(evt.pointerId)
          } catch (e) {
            //Nothing to do with the error.
          }
          this['_currentActiveButton'] = -1

          this['_previousPosition'] = null
          if (!noPreventDefault) {
            evt.preventDefault()
          }

          this['_activePointerId'] = -1
        } else if (
          p.type === BABYLON.PointerEventTypes.POINTERMOVE &&
          (this['_activePointerId'] === evt.pointerId || !isTouch)
        ) {
          if (engine.isPointerLock && this['_onMouseMove']) {
            this['_onMouseMove'](p.event)
          } else if (this['_previousPosition']) {
            let offsetX = evt.clientX - this['_previousPosition'].x
            const offsetY = evt.clientY - this['_previousPosition'].y
            if (this.camera.getScene().useRightHandedSystem) {
              offsetX *= -1
            }
            if (this.camera.parent && this.camera.parent._getWorldMatrixDeterminant() < 0) {
              offsetX *= -1
            }

            if (this._allowCameraRotation) {
              this.camera.cameraRotation.y += (this.invertXAxis * offsetX) / this.angularSensibility
              this.camera.cameraRotation.x += (this.invertYAxis * offsetY) / this.angularSensibility
            }
            this.onPointerMovedObservable.notifyObservers({ offsetX: offsetX, offsetY: offsetY })

            this['_previousPosition'] = {
              x: evt.clientX,
              y: evt.clientY
            }

            if (!noPreventDefault) {
              evt.preventDefault()
            }
          }
        }
      }
    }

    this['_onMouseMove'] = (evt: any) => {
      if (!engine.isPointerLock) {
        return
      }

      if (engine.isInVRExclusivePointerMode) {
        return
      }

      let offsetX = evt.movementX
      if (this.camera.getScene().useRightHandedSystem) {
        offsetX *= -1
      }
      if (this.camera.parent && this.camera.parent._getWorldMatrixDeterminant() < 0) {
        offsetX *= -1
      }
      this.camera.cameraRotation.y += (this.invertXAxis * offsetX) / this.angularSensibility

      const offsetY = evt.movementY
      this.camera.cameraRotation.x += (this.invertYAxis * offsetY) / this.angularSensibility

      this['_previousPosition'] = null

      if (!noPreventDefault) {
        evt.preventDefault()
      }
    }

    this['_observer'] = this.camera
      .getScene()
      ._inputManager._addCameraPointerObserver(
        this['_pointerInput'],
        BABYLON.PointerEventTypes.POINTERDOWN |
          BABYLON.PointerEventTypes.POINTERUP |
          BABYLON.PointerEventTypes.POINTERMOVE
      )

    if (element) {
      this['_contextMenuBind'] = this.onContextMenu.bind(this)
      element.addEventListener('contextmenu', this['_contextMenuBind'], false) // TODO: We need to figure out how to handle this for Native
    }
  }
}
