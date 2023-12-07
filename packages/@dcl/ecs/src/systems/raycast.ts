import * as components from '../components'
import { ColliderLayer, RaycastQueryType, PBRaycastResult } from '../components'
import { DeepReadonlyObject, Entity, IEngine } from '../engine'
import { Vector3 } from '../components/generated/pb/decentraland/common/vectors.gen'
import { EntityState } from '../engine/entity'

/**
 * @public
 */
export type RaycastSystemCallback = (event: DeepReadonlyObject<PBRaycastResult>) => void

/**
 * @public
 */
export type RaycastSystemOptions = {
  originOffset?: Vector3 | undefined

  // @internal
  directionRawValue?:
    | { $case: 'localDirection'; localDirection: Vector3 }
    | { $case: 'globalDirection'; globalDirection: Vector3 }
    | { $case: 'globalTarget'; globalTarget: Vector3 }
    | { $case: 'targetEntity'; targetEntity: number }

  maxDistance: number
  queryType: RaycastQueryType
  continuous?: boolean | undefined
  collisionMask?: number | undefined
}

export type LocalDirectionRaycastSystemOptions = {
  direction?: Vector3
}
export type LocalDirectionRaycastOptions = RaycastSystemOptions & LocalDirectionRaycastSystemOptions

export type GlobalDirectionRaycastSystemOptions = {
  direction?: Vector3
}
export type GlobalDirectionRaycastOptions = RaycastSystemOptions & GlobalDirectionRaycastSystemOptions

export type GlobalTargetRaycastSystemOptions = {
  target?: Vector3
}
export type GlobalTargetRaycastOptions = RaycastSystemOptions & GlobalTargetRaycastSystemOptions

export type TargetEntityRaycastSystemOptions = {
  targetEntity?: number
}
export type TargetEntityRaycastOptions = RaycastSystemOptions & TargetEntityRaycastSystemOptions

/**
 * @public
 */
export interface RaycastSystem {
  /**
   * @public
   * Remove the callback for raycast event
   * @param entity - Entity where the callback was attached
   */
  removeRaycasterEntity(entity: Entity): void

  /**
   * @public
   * Execute callback when the entity receives a RaycastResult component update.
   * Uses a Vector3 entity-local direction value to calculate the ray direction
   * @param raycastData -  Entity to attach the callback and Raycast configuration options
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   */
  registerLocalDirectionRaycast(
    raycastData: { entity: Entity; opts?: Partial<LocalDirectionRaycastOptions> },
    callback: RaycastSystemCallback
  ): void

  /**
   * @deprecated use registerLocalDirectionRaycast(raycastData, cb) instead
   * @param entity - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerLocalDirectionRaycast(
    entity: Entity,
    callback: RaycastSystemCallback,
    options?: Partial<LocalDirectionRaycastOptions>
  ): void

  /**
   * @public
   * Execute callback when the entity receives a RaycastResult component update.
   * Uses a Vector3 global direction value to calculate the ray direction
   * @param raycastData - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   */
  registerGlobalDirectionRaycast(
    raycastData: { entity: Entity; opts?: Partial<GlobalDirectionRaycastOptions> },
    callback: RaycastSystemCallback
  ): void

  /**
   * @deprecated use registerGlobalDirectionRaycast(raycastData, cb) instead
   * @param entity - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerGlobalDirectionRaycast(
    entity: Entity,
    callback: RaycastSystemCallback,
    options?: Partial<GlobalDirectionRaycastOptions>
  ): void

  /**
   * @public
   * Execute callback when the entity receives a RaycastResult component update.
   * Uses a Vector3 global target position to calculate the ray direction
   * @param raycastData - Entity to attach the callback and Raycast configuration options
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   */
  registerGlobalTargetRaycast(
    raycastData: { entity: Entity; opts?: Partial<GlobalTargetRaycastOptions> },
    callback: RaycastSystemCallback
  ): void
  /**
   * @deprecated use registerGlobalTargetRaycast(raycastData, cb) instead
   * @param entity - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerGlobalTargetRaycast(
    entity: Entity,
    callback: RaycastSystemCallback,
    options?: Partial<GlobalTargetRaycastOptions>
  ): void

  /**
   * @public
   * Execute callback when the entity receives a RaycastResult component update.
   * Uses an target Entity value to calculate the ray direction
   * @param raycastData - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerTargetEntityRaycast(
    raycastData: { entity: Entity; opts?: Partial<TargetEntityRaycastOptions> },
    callback: RaycastSystemCallback
  ): void
  /**
   * @deprecated use registerTargetEntityRaycast(raycastData, cb) instead
   * @param entity - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerTargetEntityRaycast(
    entity: Entity,
    callback: RaycastSystemCallback,
    options?: Partial<TargetEntityRaycastOptions>
  ): void

  /**
   * @public
   * Creates Raycast local direction opts with defaults
   */
  localDirectionOptions(options?: Partial<LocalDirectionRaycastOptions>): RaycastSystemOptions
  /**
   * @public
   * Creates Raycast global direction opts with defaults
   */
  globalDirectionOptions(options?: Partial<GlobalDirectionRaycastOptions>): RaycastSystemOptions
  /**
   * @public
   * Creates Raycast global target direction opts with defaults
   */
  globalTargetOptions(options?: Partial<GlobalTargetRaycastOptions>): RaycastSystemOptions
  /**
   * @public
   * Creates Raycast target entity opts with defaults
   */
  targetEntitytOptions(options?: Partial<TargetEntityRaycastOptions>): RaycastSystemOptions

  /**
   * @public
   * Immediate mode Raycast to be used on a sytem rather than callbacks
   *
   * Use the options helper to create the specified raycast i.e. localDirectionOptions(opts)
   */
  registerRaycast(entity: Entity, options: RaycastSystemOptions): DeepReadonlyObject<PBRaycastResult> | null
}

/**
 * @internal
 */
export function createRaycastSystem(engine: IEngine): RaycastSystem {
  const Raycast = components.Raycast(engine)
  const RaycastResult = components.RaycastResult(engine)
  const entitiesCallbackResultMap = new Map<Entity, { callback: RaycastSystemCallback }>()

  const defaultOptions: RaycastSystemOptions = {
    maxDistance: 16,
    queryType: RaycastQueryType.RQT_HIT_FIRST,
    continuous: false,
    originOffset: { x: 0, y: 0, z: 0 },
    collisionMask: ColliderLayer.CL_PHYSICS
  }
  const getLocalDirectionRaycastDefaultOptions = (
    options: Partial<LocalDirectionRaycastOptions> = {}
  ): RaycastSystemOptions => ({
    ...defaultOptions,
    ...options,
    directionRawValue: {
      $case: 'localDirection',
      localDirection: options.direction || { x: 0, y: 0, z: 1 }
    }
  })
  const getGlobalDirectionRaycastDefaultOptions = (
    options: Partial<GlobalDirectionRaycastOptions> = {}
  ): RaycastSystemOptions => ({
    ...defaultOptions,
    ...options,
    directionRawValue: {
      $case: 'globalDirection',
      globalDirection: options.direction || { x: 0, y: 0, z: 1 }
    }
  })
  const getGlobalTargetRaycastDefaultOptions = (
    options: Partial<GlobalTargetRaycastOptions> = {}
  ): RaycastSystemOptions => ({
    ...defaultOptions,
    ...options,
    directionRawValue: {
      $case: 'globalTarget',
      globalTarget: options.target || { x: 0, y: 0, z: 0 }
    }
  })
  const getTargetEntityRaycastDefaultOptions = (
    options: Partial<TargetEntityRaycastOptions> = {}
  ): RaycastSystemOptions => ({
    ...defaultOptions,
    ...options,
    directionRawValue: {
      $case: 'targetEntity',
      targetEntity: options.targetEntity || 0
    }
  })

  const nextTickRaycasts: (() => void)[] = []
  function registerRaycastWithCallback(
    entity: Entity,
    raycastValue: RaycastSystemOptions,
    callback: RaycastSystemCallback
  ) {
    // Raycasts registration is delayed 1 frame to avoid same-frame raycast
    // removal/adding (the client never receives the removal on those situations)
    const onNextTick = () => {
      const raycast = Raycast.createOrReplace(entity)
      raycast.maxDistance = raycastValue.maxDistance
      raycast.originOffset = raycastValue.originOffset
      raycast.collisionMask = raycastValue.collisionMask
      raycast.direction = raycastValue.directionRawValue
      raycast.continuous = raycastValue.continuous
      raycast.queryType = raycastValue.queryType

      entitiesCallbackResultMap.set(entity, { callback: callback })
    }
    nextTickRaycasts.push(onNextTick)
  }

  function removeRaycast(entity: Entity) {
    Raycast.deleteFrom(entity)
    RaycastResult.deleteFrom(entity)
    entitiesCallbackResultMap.delete(entity)
  }

  // @internal
  engine.addSystem(function EventSystem() {
    for (const addMissingRaycast of nextTickRaycasts) {
      addMissingRaycast()
    }
    nextTickRaycasts.length = 0

    for (const [entity, data] of entitiesCallbackResultMap) {
      const raycast = Raycast.getOrNull(entity)
      if (engine.getEntityState(entity) === EntityState.Removed || !raycast) {
        entitiesCallbackResultMap.delete(entity)
        continue
      }

      const currentResult = RaycastResult.getOrNull(entity)
      if (!currentResult) continue

      data.callback(currentResult)

      if (!raycast.continuous) removeRaycast(entity)
    }
  })

  const registerLocalDirectionRaycast: RaycastSystem['registerLocalDirectionRaycast'] = (...args) => {
    const [data, cb, maybeOpts] = args
    if (typeof data === 'number') {
      return registerLocalDirectionRaycast({ entity: data, opts: maybeOpts ?? {} }, cb)
    }
    const { entity, opts } = data
    registerRaycastWithCallback(entity, getLocalDirectionRaycastDefaultOptions(opts), cb)
  }
  const registerGlobalDirectionRaycast: RaycastSystem['registerGlobalDirectionRaycast'] = (...args) => {
    const [data, cb, maybeOpts] = args
    if (typeof data === 'number') {
      return registerGlobalDirectionRaycast({ entity: data, opts: maybeOpts ?? {} }, cb)
    }
    const { entity, opts } = data
    registerRaycastWithCallback(entity, getGlobalDirectionRaycastDefaultOptions(opts), cb)
  }
  const registerGlobalTargetRaycast: RaycastSystem['registerGlobalTargetRaycast'] = (...args) => {
    const [data, cb, maybeOpts] = args
    if (typeof data === 'number') {
      return registerGlobalTargetRaycast({ entity: data, opts: maybeOpts ?? {} }, cb)
    }
    const { entity, opts } = data
    registerRaycastWithCallback(entity, getGlobalTargetRaycastDefaultOptions(opts), cb)
  }
  const registerTargetEntityRaycast: RaycastSystem['registerTargetEntityRaycast'] = (...args) => {
    const [data, cb, maybeOpts] = args
    if (typeof data === 'number') {
      return registerTargetEntityRaycast({ entity: data, opts: maybeOpts ?? {} }, cb)
    }
    const { entity, opts } = data
    registerRaycastWithCallback(entity, getTargetEntityRaycastDefaultOptions(opts), cb)
  }

  return {
    removeRaycasterEntity(entity: Entity) {
      removeRaycast(entity)
    },
    registerLocalDirectionRaycast,
    registerGlobalDirectionRaycast,
    registerGlobalTargetRaycast,
    registerTargetEntityRaycast,
    registerRaycast(entity, opts) {
      const raycast = Raycast.getOrNull(entity)
      if (!raycast) Raycast.create(entity, { ...opts, direction: opts.directionRawValue })
      const value = RaycastResult.getOrNull(entity)
      if (value) {
        if (!opts.continuous) {
          RaycastResult.deleteFrom(entity)
          Raycast.deleteFrom(entity)
        }
      }
      return value
    },
    localDirectionOptions: getLocalDirectionRaycastDefaultOptions,
    globalDirectionOptions: getGlobalDirectionRaycastDefaultOptions,
    globalTargetOptions: getGlobalTargetRaycastDefaultOptions,
    targetEntitytOptions: getTargetEntityRaycastDefaultOptions
  }
}
