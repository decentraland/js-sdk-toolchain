import { Composite, components } from '../../packages/@dcl/ecs/src'
import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'

const COMPOSITE_SOURCE = 'two-children.composite'

/** Two entities, both parented to the composite's own root, which is entity 0. */
const COMPOSITE_JSON = {
  version: 1,
  components: [
    {
      name: 'core::Transform',
      data: {
        '518': { $case: 'json', json: { position: { x: 1, y: 1, z: 1 }, parent: 0 } },
        '519': { $case: 'json', json: { position: { x: 2, y: 2, z: 2 }, parent: 0 } }
      }
    }
  ]
}

function loadComposite(): Composite.Resource {
  return { src: COMPOSITE_SOURCE, composite: Composite.fromJson(COMPOSITE_JSON) }
}

function compositeProvider(resource: Composite.Resource): Composite.Provider {
  return { getCompositeOrNull: (src) => (src === resource.src ? resource : null) }
}

describe('when a composite is instanced onto the root entity', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let returnedRoot: Entity

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)

    const resource = loadComposite()
    returnedRoot = Composite.instance(engine, resource, compositeProvider(resource), {
      rootEntity: engine.RootEntity
    })
  })

  it('should return the root entity', () => {
    expect(returnedRoot).toBe(engine.RootEntity)
  })

  it('should parent every composite entity to it', () => {
    const parents = Array.from(engine.getEntitiesWith(Transform)).map(([, transform]) => transform.parent)

    expect(parents).toEqual([engine.RootEntity, engine.RootEntity])
  })

  it('should create one entity per composite entity and nothing else', () => {
    expect(Array.from(engine.getEntitiesWith(Transform))).toHaveLength(2)
  })
})

describe('when a composite is instanced onto an ordinary entity', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let host: Entity

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    host = engine.addEntity()

    const resource = loadComposite()
    Composite.instance(engine, resource, compositeProvider(resource), { rootEntity: host })
  })

  it('should parent every composite entity to that entity', () => {
    const parents = Array.from(engine.getEntitiesWith(Transform)).map(([, transform]) => transform.parent)

    expect(parents).toEqual([host, host])
  })
})

describe('when a composite is instanced without naming a root entity', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let returnedRoot: Entity

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)

    const resource = loadComposite()
    returnedRoot = Composite.instance(engine, resource, compositeProvider(resource))
  })

  it('should parent every composite entity to the root it allocated', () => {
    const parents = Array.from(engine.getEntitiesWith(Transform)).map(([, transform]) => transform.parent)

    expect(parents).toEqual([returnedRoot, returnedRoot])
  })
})
