import * as BABYLON from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials'
import { PARCEL_SIZE } from '../../utils/scene'
import { CameraManager } from '../decentraland/camera'
import { InspectorPreferences } from '../../logic/preferences/types'

// if NODE_ENV == development
require('@babylonjs/inspector')

// Camera settings
const CAMERA_SPEEDS = [...Array(40).keys()]
  .map((_, i) => {
    return (i + 1) * 0.5
  })
  .concat([25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100])
const CAMERA_DEFAULT_SPEED_INDEX = 20
const CAMERA_MIN_Y = 1
const CAMERA_ZOOM_SENSITIVITY = 1

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

export function setupEngine(engine: BABYLON.Engine, canvas: HTMLCanvasElement, preferences: InspectorPreferences) {
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

  // Set bounding box color = red
  scene.getBoundingBoxRenderer().frontColor.set(1, 0, 0)
  scene.getBoundingBoxRenderer().backColor.set(1, 0, 0)
  // Material for entity outside layout
  const entityOutsideLayoutMaterial = new BABYLON.StandardMaterial('entity_outside_layout', scene)
  entityOutsideLayoutMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0)
  entityOutsideLayoutMaterial.backFaceCulling = false

  BABYLON.Database.IDBStorageEnabled = true
  engine.enableOfflineSupport = true

  const editorColor = BABYLON.Color3.FromHexString('#17141B')
  const editorEnvHelper = scene.createDefaultEnvironment({
    groundColor: editorColor,
    skyboxColor: new BABYLON.Color3(0.1, 0.5, 0.99),
    skyboxSize: 1000,
    groundSize: 1000
  })!

  const grid = new GridMaterial('grid', scene)
  grid.gridRatio = 1
  grid.majorUnitFrequency = 4
  grid.lineColor = BABYLON.Color3.FromHexString('#504E58')
  grid.mainColor = BABYLON.Color3.FromHexString('#36343D')
  editorEnvHelper.ground!.material = grid

  const cameraManager = new CameraManager(
    scene,
    canvas,
    CAMERA_SPEEDS,
    CAMERA_DEFAULT_SPEED_INDEX,
    CAMERA_MIN_Y,
    CAMERA_ZOOM_SENSITIVITY
  )
  cameraManager.setFreeCameraInvertRotation(preferences.freeCameraInvertRotation)

  const hemiLight = new BABYLON.HemisphericLight('default light', ambientConfigurations.sunPosition, scene)
  hemiLight.diffuse = BABYLON.Color3.White()
  hemiLight.groundColor = ambientConfigurations.groundColor.clone()
  hemiLight.specular = ambientConfigurations.sunColor.clone()

  reposition(editorEnvHelper, hemiLight, cameraManager)

  function update() {
    reposition(editorEnvHelper, hemiLight, cameraManager)
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

function reposition(envHelper: BABYLON.EnvironmentHelper, hemiLight: BABYLON.HemisphericLight, camera: CameraManager) {
  const cameraPosition = camera.getGlobalPosition()

  // set the ground at 0 always and round position towards PARCEL_SIZE
  envHelper.ground!.position.set(
    Math.floor(cameraPosition.x / PARCEL_SIZE) * PARCEL_SIZE - cameraPosition.x,
    -cameraPosition.y,
    Math.floor(cameraPosition.z / PARCEL_SIZE) * PARCEL_SIZE - cameraPosition.z
  )

  // make the skybox follow the camera target
  envHelper.skybox!.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
  envHelper.rootMesh.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)

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
