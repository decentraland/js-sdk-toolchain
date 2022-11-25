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
  const Transform = engine.baseComponents.Transform
  return () => {
    for (const entity of Transform.dirtyIterator()) {
      let transform = Transform.getOrNull(entity)
      while (transform && transform.parent) {
        if (transform.parent === entity) {
          throw new Error(`There is a cyclic parent with entity ${entity}`)
          // TODO: error(`There is a cyclic parent with entity ${entity}`)
          break
        } else {
          transform = Transform.getOrNull(transform.parent)
        }
      }
    }
  }
}
