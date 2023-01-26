/**
 * The module ecs is exposed by the sdk via `@dcl/sdk/ecs`
 *
 * It defines the engine, components & systems for the SDK 7.

* @example
 * ```tsx
 * import { engine, Transform } from '@dcl/sdk/ecs'
 * const entity = engine.addEntity()
 * Transform.create(entity, defaultPosition)
 * ```
 *
 * @module ECS
 *
 */

export * from '@dcl/ecs'
