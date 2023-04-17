import * as components from '../components'
import { ColliderLayer, RaycastQueryType, PBRaycastResult } from '../components'
import { DeepReadonlyObject, Entity, IEngine } from '../engine'
import { Vector3 } from '../components/generated/pb/decentraland/common/vectors.gen'
import { EntityState } from '../engine/entity'

/**
 * @public
 */
export type RaycastHelperSystemCallback = (event: DeepReadonlyObject<PBRaycastResult>) => void

/**
 * @public
 */
export type RaycastHelperSystemOptions = {
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

export type LocalDirectionRaycastHelperSystemOptions = {
  direction?: Vector3
}
export type LocalDirectionRaycastOptions = RaycastHelperSystemOptions & LocalDirectionRaycastHelperSystemOptions

export type GlobalDirectionRaycastHelperSystemOptions = {
  direction?: Vector3
}
export type GlobalDirectionRaycastOptions = RaycastHelperSystemOptions & GlobalDirectionRaycastHelperSystemOptions

export type GlobalTargetRaycastHelperSystemOptions = {
  target?: Vector3
}
export type GlobalTargetRaycastOptions = RaycastHelperSystemOptions & GlobalTargetRaycastHelperSystemOptions

export type TargetEntityRaycastHelperSystemOptions = {
  targetEntity?: number
}
export type TargetEntityRaycastOptions = RaycastHelperSystemOptions & TargetEntityRaycastHelperSystemOptions

/**
 * @public
 */
export interface RaycastHelperSystem {
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
   * @param entity - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerLocalDirectionRaycast(
    entity: Entity,
    callback: RaycastHelperSystemCallback,
    options?: Partial<LocalDirectionRaycastOptions>
  ): void

  /**
   * @public
   * Execute callback when the entity receives a RaycastResult component update.
   * Uses a Vector3 global direction value to calculate the ray direction
   * @param entity - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerGlobalDirectionRaycast(
    entity: Entity,
    callback: RaycastHelperSystemCallback,
    options?: Partial<GlobalDirectionRaycastOptions>
  ): void

  /**
   * @public
   * Execute callback when the entity receives a RaycastResult component update.
   * Uses a Vector3 global target position to calculate the ray direction
   * @param entity - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerGlobalTargetRaycast(
    entity: Entity,
    callback: RaycastHelperSystemCallback,
    options?: Partial<GlobalTargetRaycastOptions>
  ): void

  /**
   * @public
   * Execute callback when the entity receives a RaycastResult component update.
   * Uses an target Entity value to calculate the ray direction
   * @param entity - Entity to attach the callback
   * @param callback - Function to execute when the entity's RaycastResult component is updated
   * @param options - Raycast configuration options
   */
  registerTargetEntityRaycast(
    entity: Entity,
    callback: RaycastHelperSystemCallback,
    options?: Partial<TargetEntityRaycastOptions>
  ): void
}

/**
 * @internal
 */
export function createRaycastHelperSystem(engine: IEngine): RaycastHelperSystem {
  const raycastComponent = components.Raycast(engine)
  const raycastResultComponent = components.RaycastResult(engine)
  const entitiesCallbackResultMap = new Map<Entity, { callback: RaycastHelperSystemCallback }>()

  const defaultOptions: RaycastHelperSystemOptions = {
    maxDistance: 16,
    queryType: RaycastQueryType.RQT_HIT_FIRST,
    continuous: false,
    originOffset: { x: 0, y: 0, z: 0 },
    collisionMask: ColliderLayer.CL_PHYSICS
  }
  const getLocalDirectionRaycastDefaultOptions = (
    options: Partial<LocalDirectionRaycastOptions> = {}
  ): RaycastHelperSystemOptions => ({
    ...defaultOptions,
    directionRawValue: {
      $case: 'localDirection',
      localDirection: options.direction || { x: 0, y: 0, z: 1 }
    },
    ...options
  })
  const getGlobalDirectionRaycastDefaultOptions = (
    options: Partial<GlobalDirectionRaycastOptions> = {}
  ): RaycastHelperSystemOptions => ({
    ...defaultOptions,
    directionRawValue: {
      $case: 'globalDirection',
      globalDirection: options.direction || { x: 0, y: 0, z: 1 }
    },
    ...options
  })
  const getGlobalTargetRaycastDefaultOptions = (
    options: Partial<GlobalTargetRaycastOptions> = {}
  ): RaycastHelperSystemOptions => ({
    ...defaultOptions,
    directionRawValue: {
      $case: 'globalTarget',
      globalTarget: options.target || { x: 0, y: 0, z: 0 }
    },
    ...options
  })
  const getTargetEntityRaycastDefaultOptions = (
    options: Partial<TargetEntityRaycastOptions> = {}
  ): RaycastHelperSystemOptions => ({
    ...defaultOptions,
    directionRawValue: {
      $case: 'targetEntity',
      targetEntity: options.targetEntity || 0
    },
    ...options
  })

  function registerRaycast(entity: Entity, callback: RaycastHelperSystemCallback, options: RaycastHelperSystemOptions) {
    const raycast = raycastComponent.getOrCreateMutable(entity)
    Object.assign(raycast, {
      maxDistance: options.maxDistance,
      originOffset: options.originOffset,
      collisionMask: options.collisionMask,
      direction: options.directionRawValue,
      continuous: options.continuous,
      queryType: options.queryType
    })

    entitiesCallbackResultMap.set(entity, { callback: callback })
  }

  function removeRaycast(entity: Entity) {
    raycastComponent.deleteFrom(entity)
    raycastResultComponent.deleteFrom(entity)
    entitiesCallbackResultMap.delete(entity)
  }

  // @internal
  engine.addSystem(function EventSystem() {
    for (const [entity, data] of entitiesCallbackResultMap) {
      const raycast = raycastComponent.getOrNull(entity)
      if (engine.getEntityState(entity) === EntityState.Removed || !raycast) {
        entitiesCallbackResultMap.delete(entity)
        continue
      }

      const currentResult = raycastResultComponent.getOrNull(entity)
      if (!currentResult) continue

      data.callback(currentResult)

      if (!raycast.continuous) removeRaycast(entity)
    }
  })

  return {
    removeRaycasterEntity(entity: Entity) {
      removeRaycast(entity)
    },
    registerLocalDirectionRaycast(
      entity: Entity,
      callback: RaycastHelperSystemCallback,
      opts?: Partial<LocalDirectionRaycastOptions>
    ) {
      registerRaycast(entity, callback, getLocalDirectionRaycastDefaultOptions(opts))
    },
    registerGlobalDirectionRaycast(
      entity: Entity,
      callback: RaycastHelperSystemCallback,
      opts?: Partial<GlobalDirectionRaycastOptions>
    ) {
      registerRaycast(entity, callback, getGlobalDirectionRaycastDefaultOptions(opts))
    },
    registerGlobalTargetRaycast(
      entity: Entity,
      callback: RaycastHelperSystemCallback,
      opts?: Partial<GlobalTargetRaycastOptions>
    ) {
      registerRaycast(entity, callback, getGlobalTargetRaycastDefaultOptions(opts))
    },
    registerTargetEntityRaycast(
      entity: Entity,
      callback: RaycastHelperSystemCallback,
      opts?: Partial<TargetEntityRaycastOptions>
    ) {
      registerRaycast(entity, callback, getTargetEntityRaycastDefaultOptions(opts))
    }
  }
}
