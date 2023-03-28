import * as BABYLON from '@babylonjs/core'
import { initKeyboard } from './input'

// if NODE_ENV == development
require('@babylonjs/inspector')

export const PARCEL_SIZE = 16
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

export function initRenderer(canvas: HTMLCanvasElement) {
  const babylon = new BABYLON.Engine(canvas, true, {
    deterministicLockstep: true,
    lockstepMaxSteps: 4,
    alpha: false,
    antialias: true,
    stencil: true
  })

  /**
   * This is the main scene of the engine.
   */
  const scene = new BABYLON.Scene(babylon)
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

  babylon.disableManifestCheck = true

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
  babylon.enableOfflineSupport = true

  const editorColor = BABYLON.Color3.FromHexString('#0e0c12')
  const editorEnvHelper = scene.createDefaultEnvironment({
    groundColor: editorColor,
    skyboxColor: editorColor,
    skyboxSize: 200,
    groundSize: 100
  })!

  editorEnvHelper!.ground!.position.y = 0
  editorEnvHelper!.rootMesh.position.y = -0.1

  const camera = new BABYLON.ArcRotateCamera(
    'editorCamera',
    -Math.PI / 2,
    Math.PI / 2.5,
    15,
    new BABYLON.Vector3(0, 0, 0),
    scene
  )

  camera.lowerRadiusLimit = 3
  camera.upperRadiusLimit = 15
  scene.activeCamera?.detachControl()
  camera.attachControl(canvas, true)
  scene.activeCamera = camera

  const hemiLight = new BABYLON.HemisphericLight('default light', ambientConfigurations.sunPosition, scene)

  hemiLight.diffuse = BABYLON.Color3.White()
  hemiLight.groundColor = ambientConfigurations.groundColor.clone()
  hemiLight.specular = ambientConfigurations.sunColor.clone()

  initKeyboard(canvas, scene, camera)

  reposition(editorEnvHelper, hemiLight, camera)

  function update() {
    reposition(editorEnvHelper, hemiLight, camera)
    scene.render()
  }

  void scene.debugLayer.show({ showExplorer: true, embedMode: true })

  // Register a render loop to repeatedly render the scene
  babylon.runRenderLoop(update)

  // Watch for browser/canvas resize events
  function resize() {
    babylon.resize(false)
  }
  window.addEventListener('resize', resize)

  function dispose() {
    babylon.dispose()
    if (window) {
      window.removeEventListener('resize', resize)
    }
  }

  return {
    editorCamera: camera,
    canvas,
    babylon,
    scene,
    audioEngine,
    effectLayers,
    highlightLayer,
    dispose
  }
}

function reposition(
  envHelper: BABYLON.EnvironmentHelper,
  hemiLight: BABYLON.HemisphericLight,
  camera: BABYLON.ArcRotateCamera
) {
  // make the skybox follow the camera target
  envHelper.rootMesh.position.set(camera.target.x, camera.target.y, camera.target.z)
  // set the ground at 0 always
  envHelper.ground!.position.set(0, -camera.target.y, 0)

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
