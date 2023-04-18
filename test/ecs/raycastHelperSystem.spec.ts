import {
  ColliderLayer,
  components,
  createRaycastSystem,
  Engine,
  IEngine,
  RaycastSystem,
  RaycastQueryType
} from '../../packages/@dcl/ecs/src'
import { Vector3 } from '../../packages/@dcl/sdk/math'

describe('Raycast Helper System should', () => {
  const engine: IEngine = Engine()
  const raycastHelperSystem: RaycastSystem = createRaycastSystem(engine)
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
    let callbacksCounter = 0
    raycastHelperSystem.registerLocalDirectionRaycast(
      continuousRaycastEntity,
      (result) => {
        callbacksCounter++
      },
      {
        direction: Vector3.Forward(),
        queryType: RaycastQueryType.RQT_HIT_FIRST,
        continuous: true
      }
    )

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
    expect(raycastComponent.getOrNull(continuousRaycastEntity)).toBeDefined()
    expect(raycastResultComponent.getOrNull(nonContinuousRaycastEntity)).toBeNull()
    expect(raycastComponent.getOrNull(nonContinuousRaycastEntity)).toBeNull()

    await engine.update(1)

    expect(callbacksCounter).toBe(2)
    expect(raycastResultComponent.getOrNull(continuousRaycastEntity)).toBeDefined()
    expect(raycastComponent.getOrNull(continuousRaycastEntity)).toBeDefined()
  })

  it('remove raycast entity correctly', async () => {
    const raycastEntity = engine.addEntity()

    let callbacksCounter = 0
    raycastHelperSystem.registerLocalDirectionRaycast(
      raycastEntity,
      (result) => {
        callbacksCounter++
      },
      {
        direction: Vector3.Zero(),
        queryType: RaycastQueryType.RQT_HIT_FIRST,
        continuous: true
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

    await engine.update(1)
    expect(callbacksCounter).toBe(2)

    raycastHelperSystem.removeRaycasterEntity(raycastEntity)

    await engine.update(1)
    expect(callbacksCounter).toBe(2)
    expect(raycastResultComponent.getOrNull(raycastEntity)).toBeNull()
    expect(raycastComponent.getOrNull(raycastEntity)).toBeNull()
  })

  it('handle deleted entities correctly', async () => {
    const raycastEntity = engine.addEntity()

    let callbacksCounter = 0
    raycastHelperSystem.registerLocalDirectionRaycast(
      raycastEntity,
      (result) => {
        callbacksCounter++
      },
      {
        direction: Vector3.Zero(),
        queryType: RaycastQueryType.RQT_HIT_FIRST,
        continuous: true
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

    await engine.update(1)
    expect(callbacksCounter).toBe(2)

    engine.removeEntity(raycastEntity)

    await engine.update(1)
    expect(callbacksCounter).toBe(2)
    expect(raycastResultComponent.getOrNull(raycastEntity)).toBeNull()
    expect(raycastComponent.getOrNull(raycastEntity)).toBeNull()
  })

  it('create default values correctly for LocalDirection', async () => {
    const raycastEntity = engine.addEntity()
    raycastHelperSystem.registerLocalDirectionRaycast(raycastEntity, (result) => {}, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_QUERY_ALL
    })

    const attachedRaycast = raycastComponent.get(raycastEntity)
    expect(attachedRaycast.continuous).toBe(false)
    expect(attachedRaycast.direction).toEqual({
      $case: 'localDirection',
      localDirection: Vector3.Forward()
    })
    expect(attachedRaycast.queryType).toBe(RaycastQueryType.RQT_QUERY_ALL)
    expect(attachedRaycast.collisionMask).toBe(ColliderLayer.CL_PHYSICS)
    expect(attachedRaycast.maxDistance).toBe(16)
    expect(attachedRaycast.originOffset).toEqual(Vector3.Zero())
  })

  it('create default values correctly for GlobalDirection', async () => {
    const raycastEntity = engine.addEntity()
    raycastHelperSystem.registerGlobalDirectionRaycast(raycastEntity, (result) => {}, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_QUERY_ALL
    })

    const attachedRaycast = raycastComponent.get(raycastEntity)
    expect(attachedRaycast.continuous).toBe(false)
    expect(attachedRaycast.direction).toEqual({
      $case: 'globalDirection',
      globalDirection: Vector3.Forward()
    })
    expect(attachedRaycast.queryType).toBe(RaycastQueryType.RQT_QUERY_ALL)
    expect(attachedRaycast.collisionMask).toBe(ColliderLayer.CL_PHYSICS)
    expect(attachedRaycast.maxDistance).toBe(16)
    expect(attachedRaycast.originOffset).toEqual(Vector3.Zero())
  })

  it('create default values correctly for GlobalTarget', async () => {
    const raycastEntity = engine.addEntity()
    const globalTarget: Vector3 = Vector3.create(15, 8, 6)
    raycastHelperSystem.registerGlobalTargetRaycast(raycastEntity, (result) => {}, {
      target: globalTarget,
      queryType: RaycastQueryType.RQT_QUERY_ALL
    })

    const attachedRaycast = raycastComponent.get(raycastEntity)
    expect(attachedRaycast.continuous).toBe(false)
    expect(attachedRaycast.direction).toEqual({
      $case: 'globalTarget',
      globalTarget: globalTarget
    })
    expect(attachedRaycast.queryType).toBe(RaycastQueryType.RQT_QUERY_ALL)
    expect(attachedRaycast.collisionMask).toBe(ColliderLayer.CL_PHYSICS)
    expect(attachedRaycast.maxDistance).toBe(16)
    expect(attachedRaycast.originOffset).toEqual(Vector3.Zero())
  })

  it('create default values correctly for TargetEntity', async () => {
    const raycastEntity = engine.addEntity()
    const targetEntity = engine.addEntity()
    raycastHelperSystem.registerTargetEntityRaycast(raycastEntity, (result) => {}, {
      targetEntity: targetEntity,
      queryType: RaycastQueryType.RQT_QUERY_ALL
    })

    const attachedRaycast = raycastComponent.get(raycastEntity)
    expect(attachedRaycast.continuous).toBe(false)
    expect(attachedRaycast.direction).toEqual({
      $case: 'targetEntity',
      targetEntity: targetEntity
    })
    expect(attachedRaycast.queryType).toBe(RaycastQueryType.RQT_QUERY_ALL)
    expect(attachedRaycast.collisionMask).toBe(ColliderLayer.CL_PHYSICS)
    expect(attachedRaycast.maxDistance).toBe(16)
    expect(attachedRaycast.originOffset).toEqual(Vector3.Zero())
  })
})
