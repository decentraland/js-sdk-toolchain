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

// Why this ? 🐉
// Well, the ~system/ is injected on runtime for every scene, and since this is an Enum type its not available at scene-runtime.
// So if you try to import this enum type on your scene from ~system/CommsApi` it will result in an undefined value.
// Thats why we export it here so you can use the enum on your scene.
export { VideoTrackSourceType } from '~system/CommsApi'
