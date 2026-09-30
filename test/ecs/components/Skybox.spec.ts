import { Engine, components, TextureWrapMode, PBSkybox } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Skybox ProtoBuf', () => {
  it('should serialize/deserialize Skybox with reflectionMap and skyboxTexture', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'images/env.png',
            wrapMode: undefined,
            filterMode: undefined,
            offset: undefined,
            tiling: undefined
          }
        }
      },
      skyboxTexture: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'images/env.png',
            wrapMode: TextureWrapMode.TWM_REPEAT,
            filterMode: undefined,
            offset: undefined,
            tiling: undefined
          }
        }
      },
      sun: undefined,
      skyColors: undefined,
      fog: undefined,
      clouds: undefined,
      stars: undefined
    })
  })

  it('should serialize/deserialize Skybox with only skyboxTexture', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'images/env.png',
            wrapMode: TextureWrapMode.TWM_REPEAT,
            filterMode: undefined,
            offset: undefined,
            tiling: undefined
          }
        }
      },
      sun: undefined,
      skyColors: undefined,
      fog: undefined,
      clouds: undefined,
      stars: undefined
    })
  })

  it('should serialize/deserialize Skybox with both fields undefined', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: undefined,
      sun: undefined,
      skyColors: undefined,
      fog: undefined,
      clouds: undefined,
      stars: undefined
    })
  })

  it('should serialize/deserialize Skybox with all groups set at once using multi-key gradients', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    // unsorted times, HDR values (r > 1) on purpose
    const multiKeyGradient = () => ({
      keys: [
        { time: 0.75, color: { r: 2.5, g: 0.1, b: 0.2, a: 1 } },
        { time: 0.1, color: { r: 0, g: 0, b: 0, a: 1 } },
        { time: 0.4, color: { r: 1, g: 1, b: 1, a: 0.5 } }
      ]
    })

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: undefined,
      sun: {
        visible: undefined,
        color: multiKeyGradient()
      },
      skyColors: {
        rim: undefined,
        zenith: multiKeyGradient(),
        horizon: multiKeyGradient(),
        nadir: multiKeyGradient()
      },
      fog: {
        color: multiKeyGradient()
      },
      clouds: {
        color: undefined,
        opacity: 0.8,
        speed: 0.02
      },
      stars: {
        brightness: 5.1
      }
    })
  })

  it('should serialize/deserialize Skybox with single-key gradients (constant colors)', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    const singleKeyGradient = () => ({
      keys: [{ time: 0.5, color: { r: 0.2, g: 0.4, b: 0.6, a: 1 } }]
    })

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: undefined,
      sun: {
        visible: undefined,
        color: singleKeyGradient()
      },
      skyColors: {
        rim: undefined,
        zenith: singleKeyGradient(),
        horizon: singleKeyGradient(),
        nadir: singleKeyGradient()
      },
      fog: {
        color: singleKeyGradient()
      },
      clouds: undefined,
      stars: undefined
    })
  })

  it('should serialize/deserialize Skybox with an empty-keys gradient (unset gradient)', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: undefined,
      sun: {
        visible: undefined,
        color: { keys: [] }
      },
      skyColors: {
        rim: undefined,
        zenith: { keys: [] },
        horizon: undefined,
        nadir: undefined
      },
      fog: undefined,
      clouds: undefined,
      stars: undefined
    })
  })

  it('should serialize/deserialize Skybox with clouds with only speed set (opacity undefined)', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: undefined,
      sun: undefined,
      skyColors: undefined,
      fog: undefined,
      clouds: {
        color: undefined,
        opacity: undefined,
        speed: 0.05
      },
      stars: undefined
    })
  })

  it('should serialize/deserialize Skybox with stars only', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: undefined,
      sun: undefined,
      skyColors: undefined,
      fog: undefined,
      clouds: undefined,
      stars: {
        brightness: 4.62
      }
    })
  })

  it('should serialize/deserialize Skybox with the sun hidden (sun.visible = false, no color)', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: undefined,
      sun: {
        color: undefined,
        visible: false
      },
      skyColors: undefined,
      fog: undefined,
      clouds: undefined,
      stars: undefined
    })
  })

  it('should serialize/deserialize Skybox with a rim gradient and a clouds color gradient', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: undefined,
      sun: undefined,
      skyColors: {
        zenith: undefined,
        horizon: undefined,
        nadir: undefined,
        rim: { keys: [{ time: 0.3, color: { r: 3.5, g: 0.9, b: 0, a: 1 } }] }
      },
      fog: undefined,
      clouds: {
        opacity: undefined,
        speed: undefined,
        color: { keys: [{ time: 0, color: { r: 1, g: 0.5, b: 0.2, a: 1 } }, { time: 1, color: { r: 0.2, g: 0.2, b: 0.4, a: 1 } }] }
      },
      stars: undefined
    })
  })

  it('should serialize/deserialize Skybox combining both textures with the new procedural groups', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'images/reflection.png',
            wrapMode: undefined,
            filterMode: undefined,
            offset: undefined,
            tiling: undefined
          }
        }
      },
      skyboxTexture: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'images/env.png',
            wrapMode: TextureWrapMode.TWM_REPEAT,
            filterMode: undefined,
            offset: undefined,
            tiling: undefined
          }
        }
      },
      sun: {
        visible: undefined,
        color: { keys: [{ time: 0.2, color: { r: 1, g: 0.9, b: 0.7, a: 1 } }] }
      },
      skyColors: undefined,
      fog: {
        color: { keys: [{ time: 0.9, color: { r: 0.3, g: 0.3, b: 0.4, a: 1 } }] }
      },
      clouds: {
        color: undefined,
        opacity: 0.6,
        speed: 0.01
      },
      stars: {
        brightness: 3
      }
    })
  })
})
