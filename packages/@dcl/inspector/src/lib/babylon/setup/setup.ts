import * as BABYLON from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials'
import { PARCEL_SIZE } from '../../utils/scene'
import { CameraManager } from '../decentraland/camera'

// if NODE_ENV == development
require('@babylonjs/inspector')

const sunInclination = -0.31

export namespace ambientConfigurations {
  // TODO: move this configurations inside EnvironmentHelper(options)
  export const groundColor = new BABYLON.Color3(0.1, 0.1, 0.1)
  export const sunColor = new BABYLON.Color3(1, 1, 1)
  export const sunPosition = new BABYLON.Vector3(-1, 0.01, 0.3).scaleInPlace(500)
  export const sunPositionColor = new BABYLON.Color3(sunPosition.x, sunPosition.y, sunPosition.z)

  export const RED = BABYLON.Color3.FromHexString('#ff004f')
  export const GREEN = BABYLON.Color3.FromHexString('#00e57a')
  export const BLUE = BABYLON.Color3.FromHexString('#00beff')
}

export function setupEngine(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
  /**
   * This is the main scene of the engine.
   */
  const scene = new BABYLON.Scene(engine)
  const audioEngine = BABYLON.Engine.audioEngine
  const effectLayers: BABYLON.EffectLayer[] = []

  const highlightLayer: BABYLON.HighlightLayer = new BABYLON.HighlightLayer('highlight', scene)

  {
    if (!scene.effectLayers.includes(highlightLayer)) {
      scene.addEffectLayer(highlightLayer)
    }

    highlightLayer.innerGlow = false
    highlightLayer.outerGlow = true

    effectLayers.push(highlightLayer)
  }

  scene.clearColor = BABYLON.Color3.FromInts(31, 29, 35).toColor4(1)
  scene.collisionsEnabled = true

  scene.autoClear = false // Color buffer
  scene.autoClearDepthAndStencil = false // Depth and stencil
  scene.setRenderingAutoClearDepthStencil(0, false)
  scene.setRenderingAutoClearDepthStencil(1, true, true, false)

  // scene.gravity = new BABYLON.Vector3(0, playerConfigurations.gravity, 0)
  // scene.enablePhysics(scene.gravity, new BABYLON.OimoJSPlugin(2))
  scene.audioEnabled = true
  scene.headphone = true
  scene.fogEnabled = false

  scene.actionManager = new BABYLON.ActionManager(scene)

  engine.disableManifestCheck = true

  scene.getBoundingBoxRenderer().showBackLines = false

  scene.onReadyObservable.addOnce(() => {
    const gl = new BABYLON.GlowLayer('glow', scene)
    effectLayers.push(gl)

    effectLayers.forEach(($) => scene.effectLayers.includes($) || scene.addEffectLayer($))

    scene.removeEffectLayer = function (this: any, layer: BABYLON.EffectLayer) {
      if (effectLayers.includes(layer)) return
      // eslint-disable-next-line prefer-rest-params
      scene.constructor.prototype.removeEffectLayer.apply(this, arguments)
    } as any

    scene.addEffectLayer = function (this: any, layer: BABYLON.EffectLayer) {
      if (effectLayers.includes(layer)) return
      // eslint-disable-next-line prefer-rest-params
      scene.constructor.prototype.addEffectLayer.apply(this, arguments)
    } as any
  })

  BABYLON.Database.IDBStorageEnabled = true
  engine.enableOfflineSupport = true

  const editorColor = BABYLON.Color3.FromHexString('#17141B')
  const editorEnvHelper = scene.createDefaultEnvironment({
    groundColor: editorColor,
    skyboxColor: editorColor,
    skyboxSize: 1000,
    groundSize: 1000
  })!

  const grid = new GridMaterial('grid', scene)
  grid.gridRatio = 1
  grid.majorUnitFrequency = 4
  grid.lineColor = BABYLON.Color3.FromHexString('#504E58')
  grid.mainColor = BABYLON.Color3.FromHexString('#36343D')
  editorEnvHelper.ground!.material = grid

  const cameraManager = new CameraManager(scene)
  scene.activeCamera?.detachControl()
  scene.activeCamera = cameraManager.getCamera()
  scene.activeCamera.attachControl(canvas, true)

  const hemiLight = new BABYLON.HemisphericLight('default light', ambientConfigurations.sunPosition, scene)
  hemiLight.diffuse = BABYLON.Color3.White()
  hemiLight.groundColor = ambientConfigurations.groundColor.clone()
  hemiLight.specular = ambientConfigurations.sunColor.clone()

  reposition(editorEnvHelper, hemiLight, cameraManager.getCamera())

  function update() {
    reposition(editorEnvHelper, hemiLight, cameraManager.getCamera())
    scene.render()
  }

  // Register a render loop to repeatedly render the scene
  engine.runRenderLoop(update)

  return {
    editorCamera: cameraManager,
    engine,
    scene,
    audioEngine,
    effectLayers,
    highlightLayer
  }
}

function reposition(
  envHelper: BABYLON.EnvironmentHelper,
  hemiLight: BABYLON.HemisphericLight,
  camera: BABYLON.Camera
) {
  // set the ground at 0 always and round position towards PARCEL_SIZE
  envHelper.ground!.position.set(
    Math.floor(camera.globalPosition.x / PARCEL_SIZE) * PARCEL_SIZE - camera.globalPosition.x,
    -camera.globalPosition.y,
    Math.floor(camera.globalPosition.z / PARCEL_SIZE) * PARCEL_SIZE - camera.globalPosition.z
  )

  // make the skybox follow the camera target
  envHelper.skybox!.position.set(camera.globalPosition.x, camera.globalPosition.y, camera.globalPosition.z)
  envHelper.rootMesh.position.set(camera.globalPosition.x, camera.globalPosition.y, camera.globalPosition.z)

  const theta = Math.PI * sunInclination
  const phi = Math.PI * -0.4

  ambientConfigurations.sunPositionColor.r = ambientConfigurations.sunPosition.x = 500 * Math.cos(phi)
  ambientConfigurations.sunPositionColor.g = ambientConfigurations.sunPosition.y = 500 * Math.sin(phi) * Math.sin(theta)
  ambientConfigurations.sunPositionColor.b = ambientConfigurations.sunPosition.z = 500 * Math.sin(phi) * Math.cos(theta)

  const sunfade = 1.0 - Math.min(Math.max(1.0 - Math.exp(ambientConfigurations.sunPosition.y / 10), 0.0), 0.9)
  hemiLight.intensity = sunfade

  hemiLight.diffuse.set(sunfade, sunfade, sunfade)
  hemiLight.groundColor.copyFrom(ambientConfigurations.groundColor).scale(sunfade)
  hemiLight.specular.copyFrom(ambientConfigurations.sunColor).scale(sunfade)
}
