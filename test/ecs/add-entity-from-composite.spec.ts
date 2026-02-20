import { readFileSync } from 'fs'
import glob from 'glob'
import path from 'path'
import { Composite, Engine, Entity, IEngine } from '../../packages/@dcl/ecs/src'
import { components } from '../../packages/@dcl/ecs/src'

const COMPOSITE_BASE_PATH = 'test/ecs/composites'

function getJsonCompositeFrom(globPath: string, cwd: string): Composite.Resource[] {
  const compositeFileContent = glob.sync(globPath, { cwd }).map((item) => ({
    src: item,
    content: readFileSync(path.resolve(cwd, item)).toString()
  }))
  return compositeFileContent.map((item) => ({
    composite: Composite.fromJson(JSON.parse(item.content)),
    src: item.src
  }))
}

function createCompositeProvider(composites: Composite.Resource[]): Composite.Provider {
  return {
    getCompositeOrNull(src: string) {
      return composites.find((item) => item.src === src) || null
    }
  }
}

describe('engine.addEntityFromComposite', () => {
  let allComposites: Composite.Resource[]
  let compositeProvider: Composite.Provider

  beforeEach(() => {
    allComposites = getJsonCompositeFrom('*.composite', COMPOSITE_BASE_PATH)
    compositeProvider = createCompositeProvider(allComposites)
  })

  describe('when the composite provider is not set', () => {
    let engine: IEngine

    beforeEach(() => {
      engine = Engine()
    })

    it('should throw an error', () => {
      expect(() => {
        engine.addEntityFromComposite('one-transform.composite')
      }).toThrow('CompositeProvider has not been set')
    })
  })

  describe('when the composite provider is set', () => {
    let engine: IEngine

    beforeEach(() => {
      engine = Engine()
      engine.setCompositeProvider(compositeProvider)
    })

    describe('and the composite src does not exist', () => {
      it('should throw an error', () => {
        expect(() => {
          engine.addEntityFromComposite('nonexistent.composite')
        }).toThrow('not found')
      })
    })

    describe('and the composite exists without transform options', () => {
      let rootEntity: Entity

      beforeEach(() => {
        rootEntity = engine.addEntityFromComposite('one-transform.composite')
      })

      it('should return a valid entity', () => {
        expect(rootEntity).toBeDefined()
        expect(typeof rootEntity).toBe('number')
      })

      it('should not create a transform on the root entity', () => {
        const Transform = components.Transform(engine)
        const transform = Transform.getOrNull(rootEntity)
        // one-transform.composite defines Transform on entity 518 (a child), not on entity 0 (root)
        expect(transform).toBeNull()
      })

      it('should create child entities with their original transform values', () => {
        const Transform = components.Transform(engine)
        let foundChild = false
        for (const [entity, transform] of engine.getEntitiesWith(Transform)) {
          if (entity !== rootEntity && transform.parent === rootEntity) {
            expect(transform.position.x).toBe(1)
            expect(transform.position.y).toBe(1)
            expect(transform.position.z).toBe(1)
            foundChild = true
          }
        }
        expect(foundChild).toBe(true)
      })
    })

    describe('and the composite exists with transform options', () => {
      let rootEntity: Entity

      beforeEach(() => {
        rootEntity = engine.addEntityFromComposite('one-transform.composite', {
          transform: {
            position: { x: 10, y: 20, z: 30 }
          }
        })
      })

      it('should return a valid entity', () => {
        expect(rootEntity).toBeDefined()
        expect(typeof rootEntity).toBe('number')
      })

      it('should override the transform with the provided values', () => {
        const Transform = components.Transform(engine)
        const transform = Transform.getOrNull(rootEntity)
        expect(transform).not.toBeNull()
        expect(transform!.position.x).toBe(10)
        expect(transform!.position.y).toBe(20)
        expect(transform!.position.z).toBe(30)
      })
    })

    describe('and the composite exists with a parent in transform options', () => {
      let parentEntity: Entity
      let rootEntity: Entity

      beforeEach(() => {
        const Transform = components.Transform(engine)
        parentEntity = engine.addEntity()
        Transform.create(parentEntity, {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        })

        rootEntity = engine.addEntityFromComposite('one-transform.composite', {
          transform: {
            position: { x: 5, y: 5, z: 5 },
            parent: parentEntity
          }
        })
      })

      it('should set the parent on the root entity transform', () => {
        const Transform = components.Transform(engine)
        const transform = Transform.getOrNull(rootEntity)
        expect(transform).not.toBeNull()
        expect(transform!.parent).toBe(parentEntity)
      })

      it('should set the position on the root entity transform', () => {
        const Transform = components.Transform(engine)
        const transform = Transform.getOrNull(rootEntity)
        expect(transform).not.toBeNull()
        expect(transform!.position.x).toBe(5)
        expect(transform!.position.y).toBe(5)
        expect(transform!.position.z).toBe(5)
      })
    })

    describe('and the composite has no transform on root (empty composite)', () => {
      describe('and no transform options are provided', () => {
        let rootEntity: Entity

        beforeEach(() => {
          rootEntity = engine.addEntityFromComposite('empty.composite')
        })

        it('should return a valid entity', () => {
          expect(rootEntity).toBeDefined()
          expect(typeof rootEntity).toBe('number')
        })

        it('should not create a transform on the root entity', () => {
          const Transform = components.Transform(engine)
          const transform = Transform.getOrNull(rootEntity)
          expect(transform).toBeNull()
        })
      })

      describe('and transform options are provided', () => {
        let rootEntity: Entity

        beforeEach(() => {
          rootEntity = engine.addEntityFromComposite('empty.composite', {
            transform: {
              position: { x: 42, y: 0, z: 0 }
            }
          })
        })

        it('should create a transform on the root entity with the provided values', () => {
          const Transform = components.Transform(engine)
          const transform = Transform.getOrNull(rootEntity)
          expect(transform).not.toBeNull()
          expect(transform!.position.x).toBe(42)
        })
      })
    })

    describe('and addEntityFromComposite is called multiple times', () => {
      let firstRoot: Entity
      let secondRoot: Entity

      beforeEach(() => {
        firstRoot = engine.addEntityFromComposite('one-transform.composite', {
          transform: { position: { x: 1, y: 0, z: 0 } }
        })
        secondRoot = engine.addEntityFromComposite('one-transform.composite', {
          transform: { position: { x: 2, y: 0, z: 0 } }
        })
      })

      it('should return different entities for each call', () => {
        expect(firstRoot).not.toBe(secondRoot)
      })

      it('should set the correct position on each entity', () => {
        const Transform = components.Transform(engine)
        expect(Transform.get(firstRoot).position.x).toBe(1)
        expect(Transform.get(secondRoot).position.x).toBe(2)
      })
    })
  })
})
