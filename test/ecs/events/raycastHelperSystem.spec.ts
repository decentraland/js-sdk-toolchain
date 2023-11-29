import {
  ColliderLayer,
  components,
  createRaycastSystem,
  Engine,
  IEngine,
  RaycastSystem,
  RaycastQueryType
} from '../../../packages/@dcl/ecs/src'
import { Vector3 } from '../../../packages/@dcl/sdk/math'

describe('Raycast Helper System should', () => {
  const engine: IEngine = Engine()
  const raycastHelperSystem: RaycastSystem = createRaycastSystem(engine)
  const raycastComponent = components.Raycast(engine)
  const raycastResultComponent = components.RaycastResult(engine)

  it('validates raycast default options helper', async () => {
    const defaultOpts = {
      maxDistance: 16,
      queryType: RaycastQueryType.RQT_HIT_FIRST,
      continuous: false,
      originOffset: { x: 0, y: 0, z: 0 },
      collisionMask: ColliderLayer.CL_PHYSICS
    }
    expect(raycastHelperSystem.localDirectionOptions()).toMatchObject({
      ...defaultOpts,
      directionRawValue: {
        $case: 'localDirection',
        localDirection: { x: 0, y: 0, z: 1 }
      }
    })
    expect(raycastHelperSystem.globalDirectionOptions()).toMatchObject({
      ...defaultOpts,
      directionRawValue: {
        $case: 'globalDirection',
        globalDirection: { x: 0, y: 0, z: 1 }
      }
    })
    expect(raycastHelperSystem.globalTargetOptions()).toMatchObject({
      ...defaultOpts,
      directionRawValue: {
        $case: 'globalTarget',
        globalTarget: { x: 0, y: 0, z: 0 }
      }
    })
    expect(raycastHelperSystem.targetEntitytOptions()).toMatchObject({
      ...defaultOpts,
      directionRawValue: {
        $case: 'targetEntity',
        targetEntity: 0
      }
    })
  })
  it('runs raycast immediate helper', async () => {
    const raycastEntity = engine.addEntity()
    function raycastSystem(dt: number) {
      const value = raycastHelperSystem.registerRaycast(
        raycastEntity,
        raycastHelperSystem.localDirectionOptions({
          direction: Vector3.Forward(),
          queryType: RaycastQueryType.RQT_HIT_FIRST
        })
      )
      if (dt === 0) expect(value).toBe(null)
      if (dt === 1)
        expect(value).toMatchObject({
          hits: [],
          direction: Vector3.Zero(),
          globalOrigin: Vector3.Zero(),
          tickNumber: 0
        })
    }

    engine.addSystem(raycastSystem)
    // dt = 0 => first iteration - null
    await engine.update(0)
    expect(raycastComponent.get(raycastEntity).queryType).toBe(RaycastQueryType.RQT_HIT_FIRST)
    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })

    // dt = 1 => second iteration - raycast result
    await engine.update(1)
    engine.removeSystem(raycastSystem)
  })

  it('run callback on raycast result for LocalDirection', async () => {
    const raycastEntity = engine.addEntity()
    const fn = jest.fn()
    raycastHelperSystem.registerLocalDirectionRaycast(raycastEntity, fn, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalled()
  })

  it('run callback on raycast result for GlobalDirection', async () => {
    const raycastEntity = engine.addEntity()
    const fn = jest.fn()
    raycastHelperSystem.registerGlobalDirectionRaycast(raycastEntity, fn, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalled()
  })

  it('run callback on raycast result for GlobalTarget', async () => {
    const raycastEntity = engine.addEntity()
    const fn = jest.fn()
    raycastHelperSystem.registerGlobalTargetRaycast(raycastEntity, fn, {
      target: Vector3.create(10, 10, 10),
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalled()
  })

  it('run callback on raycast result for TargetEntity', async () => {
    const raycastEntity = engine.addEntity()
    const targetEntity = engine.addEntity()

    const fn = jest.fn()
    raycastHelperSystem.registerTargetEntityRaycast(raycastEntity, fn, {
      targetEntity: targetEntity,
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalled()
  })

  it('remove raycast and raycastResult of non-continuous raycast entity', async () => {
    const continuousRaycastEntity = engine.addEntity()
    const fn = jest.fn()
    raycastHelperSystem.registerLocalDirectionRaycast(continuousRaycastEntity, fn, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_HIT_FIRST,
      continuous: true
    })

    const nonContinuousRaycastEntity = engine.addEntity()
    raycastHelperSystem.registerLocalDirectionRaycast(nonContinuousRaycastEntity, (_result) => {}, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_HIT_FIRST,
      continuous: false
    })

    // Simulate client-side result attachment
    raycastResultComponent.create(continuousRaycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })
    raycastResultComponent.create(nonContinuousRaycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })

    await engine.update(1)

    expect(raycastResultComponent.getOrNull(continuousRaycastEntity)).not.toBeNull()
    expect(raycastComponent.getOrNull(continuousRaycastEntity)).not.toBeNull()
    expect(raycastResultComponent.getOrNull(nonContinuousRaycastEntity)).toBeNull()
    expect(raycastComponent.getOrNull(nonContinuousRaycastEntity)).toBeNull()

    await engine.update(1)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(raycastResultComponent.getOrNull(continuousRaycastEntity)).not.toBeNull()
    expect(raycastComponent.getOrNull(continuousRaycastEntity)).not.toBeNull()
  })

  it('remove raycast entity correctly', async () => {
    const raycastEntity = engine.addEntity()

    const fn = jest.fn()
    raycastHelperSystem.registerLocalDirectionRaycast(raycastEntity, fn, {
      direction: Vector3.Zero(),
      queryType: RaycastQueryType.RQT_HIT_FIRST,
      continuous: true
    })

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(1)

    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(2)

    raycastHelperSystem.removeRaycasterEntity(raycastEntity)

    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(raycastResultComponent.getOrNull(raycastEntity)).toBeNull()
    expect(raycastComponent.getOrNull(raycastEntity)).toBeNull()
  })

  it('handle deleted entities correctly', async () => {
    const raycastEntity = engine.addEntity()

    const fn = jest.fn()
    raycastHelperSystem.registerLocalDirectionRaycast(raycastEntity, fn, {
      direction: Vector3.Zero(),
      queryType: RaycastQueryType.RQT_HIT_FIRST,
      continuous: true
    })

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(1)

    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(2)

    engine.removeEntity(raycastEntity)

    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(raycastResultComponent.getOrNull(raycastEntity)).toBeNull()
    expect(raycastComponent.getOrNull(raycastEntity)).toBeNull()
  })

  it('create default values correctly for LocalDirection', async () => {
    const raycastEntity = engine.addEntity()
    raycastHelperSystem.registerLocalDirectionRaycast(raycastEntity, (_result) => {}, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_QUERY_ALL
    })

    await engine.update(1)

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

  it('create default values correctly for LocalDirection without opts', async () => {
    const raycastEntity = engine.addEntity()
    raycastHelperSystem.registerLocalDirectionRaycast(raycastEntity, (_result) => {})

    await engine.update(1)

    const attachedRaycast = raycastComponent.get(raycastEntity)
    expect(attachedRaycast.continuous).toBe(false)
    expect(attachedRaycast.direction).toEqual({
      $case: 'localDirection',
      localDirection: Vector3.Forward()
    })
    expect(attachedRaycast.queryType).toBe(RaycastQueryType.RQT_HIT_FIRST)
    expect(attachedRaycast.collisionMask).toBe(ColliderLayer.CL_PHYSICS)
    expect(attachedRaycast.maxDistance).toBe(16)
    expect(attachedRaycast.originOffset).toEqual(Vector3.Zero())
  })

  it('create default values correctly for GlobalDirection', async () => {
    const raycastEntity = engine.addEntity()
    raycastHelperSystem.registerGlobalDirectionRaycast(raycastEntity, (_result) => {}, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_QUERY_ALL
    })

    await engine.update(1)

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

  it('create default values correctly for GlobalDirection without opts', async () => {
    const raycastEntity = engine.addEntity()
    raycastHelperSystem.registerGlobalDirectionRaycast(raycastEntity, (_result) => {})

    await engine.update(1)

    const attachedRaycast = raycastComponent.get(raycastEntity)
    expect(attachedRaycast.continuous).toBe(false)
    expect(attachedRaycast.direction).toEqual({
      $case: 'globalDirection',
      globalDirection: Vector3.Forward()
    })
    expect(attachedRaycast.queryType).toBe(RaycastQueryType.RQT_HIT_FIRST)
    expect(attachedRaycast.collisionMask).toBe(ColliderLayer.CL_PHYSICS)
    expect(attachedRaycast.maxDistance).toBe(16)
    expect(attachedRaycast.originOffset).toEqual(Vector3.Zero())
  })

  it('create default values correctly for GlobalTarget', async () => {
    const raycastEntity = engine.addEntity()
    const globalTarget: Vector3 = Vector3.create(15, 8, 6)
    raycastHelperSystem.registerGlobalTargetRaycast(raycastEntity, (_result) => {}, {
      target: globalTarget,
      queryType: RaycastQueryType.RQT_QUERY_ALL
    })

    await engine.update(1)

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

  it('create default values correctly for GlobalTarget without opts', async () => {
    const raycastEntity = engine.addEntity()
    raycastHelperSystem.registerGlobalTargetRaycast(raycastEntity, (_result) => {})

    await engine.update(1)

    const attachedRaycast = raycastComponent.get(raycastEntity)
    expect(attachedRaycast.continuous).toBe(false)
    expect(attachedRaycast.direction).toEqual({
      $case: 'globalTarget',
      globalTarget: Vector3.Zero()
    })
    expect(attachedRaycast.queryType).toBe(RaycastQueryType.RQT_HIT_FIRST)
    expect(attachedRaycast.collisionMask).toBe(ColliderLayer.CL_PHYSICS)
    expect(attachedRaycast.maxDistance).toBe(16)
    expect(attachedRaycast.originOffset).toEqual(Vector3.Zero())
  })

  it('create default values correctly for TargetEntity', async () => {
    const raycastEntity = engine.addEntity()
    const targetEntity = engine.addEntity()
    raycastHelperSystem.registerTargetEntityRaycast(raycastEntity, (_result) => {}, {
      targetEntity: targetEntity,
      queryType: RaycastQueryType.RQT_QUERY_ALL
    })

    await engine.update(1)

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

  it('create default values correctly for TargetEntity without opts', async () => {
    const raycastEntity = engine.addEntity()
    raycastHelperSystem.registerTargetEntityRaycast(raycastEntity, (_result) => {})

    await engine.update(1)

    const attachedRaycast = raycastComponent.get(raycastEntity)
    expect(attachedRaycast.continuous).toBe(false)
    expect(attachedRaycast.direction).toEqual({
      $case: 'targetEntity',
      targetEntity: 0
    })
    expect(attachedRaycast.queryType).toBe(RaycastQueryType.RQT_HIT_FIRST)
    expect(attachedRaycast.collisionMask).toBe(ColliderLayer.CL_PHYSICS)
    expect(attachedRaycast.maxDistance).toBe(16)
    expect(attachedRaycast.originOffset).toEqual(Vector3.Zero())
  })

  it('wait until entity has raycastResult to run callback', async () => {
    const raycastEntity = engine.addEntity()
    const fn = jest.fn()
    raycastHelperSystem.registerLocalDirectionRaycast(raycastEntity, fn, {
      direction: Vector3.Forward(),
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })

    // update without raycastResult attachment
    await engine.update(1)
    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(0)

    // Simulate client-side result attachment
    raycastResultComponent.create(raycastEntity, {
      hits: [],
      direction: Vector3.Zero(),
      globalOrigin: Vector3.Zero(),
      tickNumber: 0
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalled()
  })

  it('attach raycast component after 1 frame', async () => {
    const raycastEntity = engine.addEntity()
    raycastHelperSystem.registerGlobalDirectionRaycast({ entity: raycastEntity }, (_result) => {})

    expect(raycastComponent.getOrNull(raycastEntity)).toBeNull()

    await engine.update(1)

    expect(raycastComponent.getOrNull(raycastEntity)).not.toBeNull()
  })
})
