import {
  components,
  createRaycastHelperSystem,
  Engine,
  IEngine,
  RaycastHelperSystem,
  RaycastQueryType
} from '../../packages/@dcl/ecs/src'
import { Vector3 } from '../../packages/@dcl/sdk/math'

describe('Raycast Helper System should', () => {
  const engine: IEngine = Engine()
  const raycastHelperSystem: RaycastHelperSystem = createRaycastHelperSystem(engine)
  const raycastComponent = components.Raycast(engine)
  const raycastResultComponent = components.RaycastResult(engine)

  it('run callback on raycast result for LocalDirection', async () => {
    const raycastEntity = engine.addEntity()
    let callbacksCounter = 0
    raycastHelperSystem.registerLocalDirectionRaycast(
      raycastEntity,
      (result) => {
        callbacksCounter++
      },
      {
        direction: Vector3.Forward(),
        queryType: RaycastQueryType.RQT_HIT_FIRST
      }
    )

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero()
    })

    await engine.update(1)
    expect(callbacksCounter).toBe(1)
  })

  it('run callback on raycast result for GlobalDirection', async () => {
    const raycastEntity = engine.addEntity()
    let callbacksCounter = 0
    raycastHelperSystem.registerGlobalDirectionRaycast(
      raycastEntity,
      (result) => {
        callbacksCounter++
      },
      {
        direction: Vector3.Forward(),
        queryType: RaycastQueryType.RQT_HIT_FIRST
      }
    )

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero()
    })

    await engine.update(1)
    expect(callbacksCounter).toBe(1)
  })

  it('run callback on raycast result for GlobalTarget', async () => {
    const raycastEntity = engine.addEntity()
    let callbacksCounter = 0
    raycastHelperSystem.registerGlobalTargetRaycast(
      raycastEntity,
      (result) => {
        callbacksCounter++
      },
      {
        target: Vector3.create(10, 10, 10),
        queryType: RaycastQueryType.RQT_HIT_FIRST
      }
    )

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero()
    })

    await engine.update(1)
    expect(callbacksCounter).toBe(1)
  })

  it('run callback on raycast result for TargetEntity', async () => {
    const raycastEntity = engine.addEntity()
    const targetEntity = engine.addEntity()

    let callbacksCounter = 0
    raycastHelperSystem.registerTargetEntityRaycast(
      raycastEntity,
      (result) => {
        callbacksCounter++
      },
      {
        targetEntity: targetEntity,
        queryType: RaycastQueryType.RQT_HIT_FIRST
      }
    )

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero()
    })

    await engine.update(1)
    expect(callbacksCounter).toBe(1)
  })

  it('remove raycast and raycastResult of non-continuous raycast entity', async () => {
    const continuousRaycastEntity = engine.addEntity()
    raycastHelperSystem.registerLocalDirectionRaycast(continuousRaycastEntity, (result) => {}, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_HIT_FIRST,
      continuous: true
    })

    const nonContinuousRaycastEntity = engine.addEntity()
    raycastHelperSystem.registerLocalDirectionRaycast(nonContinuousRaycastEntity, (result) => {}, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_HIT_FIRST,
      continuous: false
    })

    // Simulate client-side result attachment
    raycastResultComponent.create(continuousRaycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero()
    })
    raycastResultComponent.create(nonContinuousRaycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero()
    })

    await engine.update(1)

    expect(raycastResultComponent.getOrNull(continuousRaycastEntity)).toBeDefined()
    expect(raycastResultComponent.getOrNull(nonContinuousRaycastEntity)).toBeNull()
  })
})
