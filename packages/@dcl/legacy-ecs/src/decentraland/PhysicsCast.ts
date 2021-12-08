import { Vector3, Matrix } from '@dcl/ecs-math'

import { RaycastResponse } from './Events'
import { uuid, log } from '../ecs/helpers'

import { Camera } from './Camera'

/**
 * @public
 */
export type QueryType =
  | 'HitFirst'
  | 'HitAll'
  | 'HitFirstAvatar'
  | 'HitAllAvatars'

/**
 * @internal
 */
enum QueryPrefix {
  HitFirst = 'rqhf',
  HitAll = 'rqha'
}

/**
 * @internal
 */
export interface RaycastQuery {
  queryId: string
  queryType: QueryType
  ray: Ray
}

/**
 * @public
 */
export interface RaycastHit {
  didHit: boolean
  ray: Ray
  hitPoint: ReadOnlyVector3
  hitNormal: ReadOnlyVector3
}

/**
 * @public
 */
export interface Ray {
  origin: ReadOnlyVector3
  direction: ReadOnlyVector3
  distance: number
}

/**
 * @public
 */
export interface HitEntityInfo {
  isValid: boolean
  entityId: string
  meshName: string
}

/**
 * @public
 */
export interface RaycastHitEntity extends RaycastHit {
  entity: HitEntityInfo
}

/**
 * @public
 */
export interface RaycastHitEntities extends RaycastHit {
  entities: RaycastHitEntity[]
}

/**
 * @public
 */
export interface BasicAvatarInfo {
  userId: string
  name: string
}

/**
 * @public
 */
export interface RaycastHitAvatar extends RaycastHit {
  avatar: BasicAvatarInfo
}

/**
 * @public
 */
export interface RaycastHitAvatars extends RaycastHit {
  avatars: BasicAvatarInfo[]
}

/**
 * @public
 */
export interface IPhysicsCast {
  hitFirst(
    ray: Ray,
    hitCallback: (event: RaycastHitEntity) => void,
    id?: number
  ): void
  hitAll(
    ray: Ray,
    hitCallback: (event: RaycastHitEntities) => void,
    id?: number
  ): void
  /** @internal */
  hitFirstAvatar(ray: Ray, hitCallback: (event: RaycastHitAvatar) => void): void
  /** @internal */
  hitAllAvatars(ray: Ray, hitCallback: (event: RaycastHitAvatars) => void): void
}

/**
 * @public
 */
export class PhysicsCast implements IPhysicsCast {
  private static _instance: PhysicsCast
  private queries: Record<string, (event: RaycastHit) => void> = {}

  private constructor() {}

  public static get instance(): PhysicsCast {
    PhysicsCast.ensureInstance()
    return PhysicsCast._instance
  }

  static ensureInstance(): any {
    if (!PhysicsCast._instance) {
      PhysicsCast._instance = new PhysicsCast()
    }
  }

  public getRayFromCamera(distance: number) {
    const rotation = Camera.instance.rotation
    const rotationMat: Matrix = Matrix.Identity()
    rotation.toRotationMatrix(rotationMat)
    const direction = Vector3.TransformCoordinates(
      Vector3.Forward(),
      rotationMat
    )

    const ray: Ray = {
      origin: Camera.instance.position,
      direction: direction,
      distance: distance
    }

    return ray
  }

  public getRayFromPositions(from: Vector3, to: Vector3) {
    const direction = to.subtract(from)
    const length = direction.length()

    const ray: Ray = {
      origin: from,
      direction: direction.normalize(),
      distance: length
    }

    return ray
  }

  public hitFirst(
    ray: Ray,
    hitCallback: (event: RaycastHitEntity) => void,
    id?: number
  ) {
    const queryId = typeof id === 'number' ? QueryPrefix.HitFirst + id : uuid()

    this.queries[queryId] = hitCallback as (event: RaycastHit) => void

    if (typeof dcl !== 'undefined') {
      dcl.query('raycast', { queryId, queryType: 'HitFirst', ray })
    }
  }

  public hitAll(
    ray: Ray,
    hitCallback: (event: RaycastHitEntities) => void,
    id?: number
  ) {
    const queryId = typeof id === 'number' ? QueryPrefix.HitAll + id : uuid()

    this.queries[queryId] = hitCallback as (event: RaycastHit) => void

    if (typeof dcl !== 'undefined') {
      dcl.query('raycast', { queryId, queryType: 'HitAll', ray })
    }
  }

  public hitFirstAvatar(
    _ray: Ray,
    _hitCallback: (event: RaycastHitAvatar) => void
  ) {
    log('not implemented yet')
  }

  public hitAllAvatars(
    _ray: Ray,
    _hitCallback: (event: RaycastHitAvatars) => void
  ) {
    log('not implemented yet')
  }

  public handleRaycastHitFirstResponse(
    response: RaycastResponse<RaycastHitEntity>
  ) {
    this.queries[response.payload.queryId](response.payload.payload)
    delete this.queries[response.payload.queryId]
  }

  public handleRaycastHitAllResponse(
    response: RaycastResponse<RaycastHitEntities>
  ) {
    this.queries[response.payload.queryId](response.payload.payload)
    delete this.queries[response.payload.queryId]
  }
}
