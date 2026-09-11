import * as components from '../components'
import { Entity } from '../engine/entity'
import { IEngine } from '../engine/types'

/**
 * Transform parenting: cyclic dependency checker
 * It checks only in modified Transforms
 *
 * Add this system with:
 * ```ts
 *  engine.addSystem(cyclicParentingChecker(engine))
 * ````
 * And then it will check every tick the parenting.
 *
 * @public
 *
 * @params engine
 * @returns a system
 */
export function cyclicParentingChecker(engine: IEngine) {
  const Transform = components.Transform(engine)
  // Reused by every walk: the checker is synchronous, so only one is ever in
  // flight. A cycle anywhere above the entity has to end the walk, not only one
  // the entity is part of, otherwise the ancestors repeat forever.
  const visited = new Set<Entity>()

  return () => {
    for (const entity of Transform.dirtyIterator()) {
      visited.clear()
      visited.add(entity)

      let transform = Transform.getOrNull(entity)
      while (transform && transform.parent) {
        if (visited.has(transform.parent)) {
          console.error(`There is a cyclic parent with entity ${entity}`)
          break
        }

        visited.add(transform.parent)
        transform = Transform.getOrNull(transform.parent)
      }
    }
  }
}
