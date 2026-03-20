import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'
import {
  PBParticleSystem_BlendMode,
  PBParticleSystem_PlaybackState,
  PBParticleSystem_SimulationSpace
} from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/particle_system.gen'

// Full object with all optional fields — required by testComponentSerialization
// since the deserializer always returns all fields (undefined for unset ones)
const emptyPS = {
  active: undefined,
  rate: undefined,
  maxParticles: undefined,
  lifetime: undefined,
  gravity: undefined,
  additionalForce: undefined,
  initialSize: undefined,
  sizeOverTime: undefined,
  initialRotation: undefined,
  rotationOverTime: undefined,
  initialColor: undefined,
  colorOverTime: undefined,
  initialVelocitySpeed: undefined,
  texture: undefined,
  blendMode: undefined,
  spriteSheet: undefined,
  shape: undefined,
  loop: undefined,
  prewarm: undefined,
  limitVelocity: undefined,
  simulationSpace: undefined,
  faceTravelDirection: undefined,
  playbackState: undefined,
  restartCount: undefined
}

describe('Generated ParticleSystem ProtoBuf', () => {
  it('should serialize/deserialize with minimal fields', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      active: true,
      rate: 10,
      lifetime: 5
    })
  })

  it('should serialize/deserialize with point emitter shape', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      active: true,
      rate: 20,
      lifetime: 3,
      maxParticles: 500,
      shape: { $case: 'point', point: {} }
    })
  })

  it('should serialize/deserialize with sphere emitter shape', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      rate: 15,
      lifetime: 4,
      shape: { $case: 'sphere', sphere: { radius: 2.5 } }
    })
  })

  it('should serialize/deserialize with cone emitter shape', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      rate: 30,
      lifetime: 2,
      shape: { $case: 'cone', cone: { angle: 45, radius: 1.5 } }
    })
  })

  it('should serialize/deserialize with box emitter shape', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      rate: 5,
      lifetime: 8,
      shape: { $case: 'box', box: { size: { x: 2, y: 1, z: 2 } } }
    })
  })

  it('should serialize/deserialize with size and color over time', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      rate: 10,
      lifetime: 5,
      initialSize: { start: 0.5, end: 1.5 },
      sizeOverTime: { start: 1.0, end: 0.0 },
      initialColor: { start: { r: 1, g: 0.5, b: 0, a: 1 }, end: { r: 1, g: 1, b: 0, a: 1 } },
      colorOverTime: { start: { r: 1, g: 1, b: 1, a: 1 }, end: { r: 0, g: 0, b: 0, a: 0 } }
    })
  })

  it('should serialize/deserialize with sprite sheet animation', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      rate: 10,
      lifetime: 2,
      spriteSheet: {
        tilesX: 4,
        tilesY: 4,
        startFrame: 0,
        endFrame: 15,
        framesPerSecond: 30
      }
    })
  })

  it('should serialize/deserialize with motion properties', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      rate: 10,
      lifetime: 5,
      gravity: -1.5,
      additionalForce: { x: 0, y: 2, z: 0 },
      initialVelocitySpeed: { start: 2, end: 5 }
    })
  })

  it('should serialize/deserialize with rendering properties', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      rate: 10,
      lifetime: 3,
      blendMode: PBParticleSystem_BlendMode.PSB_ADD,
      faceTravelDirection: true
    })
  })

  it('should serialize/deserialize playback state', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      rate: 10,
      lifetime: 5,
      playbackState: PBParticleSystem_PlaybackState.PS_PAUSED,
      restartCount: 3
    })
  })

  it('should serialize/deserialize simulation space', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)

    testComponentSerialization(ParticleSystem, {
      ...emptyPS,
      rate: 10,
      lifetime: 5,
      simulationSpace: PBParticleSystem_SimulationSpace.PSS_WORLD
    })
  })

  it('should use Shape helpers to build emitter shapes', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)
    const entity = newEngine.addEntity()

    ParticleSystem.create(entity, {
      rate: 10,
      lifetime: 5,
      shape: ParticleSystem.Shape.Cone({ angle: 30, radius: 1 })
    })

    const component = ParticleSystem.get(entity)
    expect(component.shape).toStrictEqual({ $case: 'cone', cone: { angle: 30, radius: 1 } })
  })

  it('should build Point shape with defaults', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)
    const entity = newEngine.addEntity()

    ParticleSystem.create(entity, {
      rate: 5,
      shape: ParticleSystem.Shape.Point()
    })

    expect(ParticleSystem.get(entity).shape).toStrictEqual({ $case: 'point', point: {} })
  })

  it('should build Sphere shape', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)
    const entity = newEngine.addEntity()

    ParticleSystem.create(entity, {
      shape: ParticleSystem.Shape.Sphere({ radius: 3 })
    })

    expect(ParticleSystem.get(entity).shape).toStrictEqual({ $case: 'sphere', sphere: { radius: 3 } })
  })

  it('should build Box shape', () => {
    const newEngine = Engine()
    const ParticleSystem = components.ParticleSystem(newEngine)
    const entity = newEngine.addEntity()

    ParticleSystem.create(entity, {
      shape: ParticleSystem.Shape.Box({ size: { x: 1, y: 2, z: 3 } })
    })

    expect(ParticleSystem.get(entity).shape).toStrictEqual({ $case: 'box', box: { size: { x: 1, y: 2, z: 3 } } })
  })
})
