import * as BABYLON from '@babylonjs/core'

export class CameraMouseInput extends BABYLON.FreeCameraMouseInput {
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
  