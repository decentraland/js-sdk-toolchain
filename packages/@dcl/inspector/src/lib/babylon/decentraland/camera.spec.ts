import * as BABYLON from '@babylonjs/core'
import { CameraManager } from './camera'

describe('Camera manager', () => {
  let engine: BABYLON.Engine
  let scene: BABYLON.Scene
  beforeEach(() => {
    engine = new BABYLON.NullEngine()
    scene = new BABYLON.Scene(engine)
  })

  describe('when changing camera speed via mouse input', () => {
    let cameraManager: CameraManager
    let mouseDown = {
      type: BABYLON.PointerEventTypes.POINTERDOWN,
      event: { pointerType: 'mouse' }
    } as unknown as BABYLON.PointerInfo
    let mouseWheelUp = {
      type: BABYLON.PointerEventTypes.POINTERWHEEL,
      event: { deltaY: -240 }
    } as unknown as BABYLON.PointerInfo
    let mouseWheelDown = {
      type: BABYLON.PointerEventTypes.POINTERWHEEL,
      event: { deltaY: 240 }
    } as unknown as BABYLON.PointerInfo

    beforeEach(() => {
      cameraManager = new CameraManager(scene, document.createElement('canvas'), [0, 1, 2], 1, 1, 1)
      mouseDown = {
        type: BABYLON.PointerEventTypes.POINTERDOWN,
        event: { pointerType: 'mouse' }
      } as unknown as BABYLON.PointerInfo
      mouseWheelUp = {
        type: BABYLON.PointerEventTypes.POINTERWHEEL,
        event: { deltaY: -240 }
      } as unknown as BABYLON.PointerInfo
      mouseWheelDown = {
        type: BABYLON.PointerEventTypes.POINTERWHEEL,
        event: { deltaY: 240 }
      } as unknown as BABYLON.PointerInfo
    })
    it('should start with correct default speed', () => {
      expect(cameraManager.getSpeed()).toBe(1)
    })
    it('should not change speed if mouse button is not down', () => {
      scene.onPointerObservable.notifyObservers(mouseWheelDown)
      expect(cameraManager.getSpeed()).toBe(1)
    })
    it('should decrease speed if mouse button is down and mouse wheel is down', () => {
      scene.onPointerObservable.notifyObservers(mouseDown)
      scene.onPointerObservable.notifyObservers(mouseWheelDown)
      expect(cameraManager.getSpeed()).toBe(0)
    })
    it('should increase speed if mouse button is down and mouse wheel is up', () => {
      scene.onPointerObservable.notifyObservers(mouseDown)
      scene.onPointerObservable.notifyObservers(mouseWheelUp)
      expect(cameraManager.getSpeed()).toBe(2)
    })
  })
})
