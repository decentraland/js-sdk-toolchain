import { existsSync, readFileSync, writeFileSync } from 'fs'
import glob from 'glob'
import {
  compositeFromJson,
  CompositeProvider,
  Engine,
  Entity,
  IEngine,
  instanceComposite
} from './../../packages/@dcl/ecs/src'

const writeToFile = process.env.UPDATE_SNAPSHOTS
const COMPOSITE_BASE_PATH = 'test/ecs/composites'

function getCompositeFrom(globPath: string) {
  const compositeFileContent = glob.sync(globPath, { absolute: true }).map((item) => readFileSync(item).toString())
  return compositeFileContent.map((item) => compositeFromJson(JSON.parse(item)))
}

function getStateAsString(engine: IEngine) {
  const state: Record<string, Record<string, any>> = {}
  for (const comp of engine.componentsIter()) {
    const componentData: Record<string, any> = {}
    for (const [entity, value] of comp.iterator()) {
      componentData[entity] = value
    }
    state[comp.componentName] = componentData
  }
  return JSON.stringify(state, null, 2)
}

describe('composite instantiation', () => {
  const validComposites = getCompositeFrom(`${COMPOSITE_BASE_PATH}/*.composite.json`)
  const invalidComposites = getCompositeFrom(`${COMPOSITE_BASE_PATH}/invalid/*.composite.json`)
  const composites = [...validComposites, ...invalidComposites]

  function instanceById(engine: IEngine, id: string, rootEntity?: Entity, alreadyRequestedId?: Set<string>) {
    const compositeProvider: CompositeProvider = {
      getCompositeOrNull(id: string) {
        return composites.find((item) => item.id === id) || null
      }
    }

    const composite = compositeProvider.getCompositeOrNull(id)
    if (!composite) {
      throw new Error(`Composite ${id} not found`)
    }

    if (rootEntity || alreadyRequestedId) {
      instanceComposite(engine, composite, () => engine.addEntity(), compositeProvider, rootEntity, alreadyRequestedId)
    } else {
      instanceComposite(engine, composite, () => engine.addEntity(), compositeProvider)
    }
  }

  validComposites.forEach((composite) => {
    it(`should instance '${composite.id}' composite`, () => {
      const engine = Engine()
      expect(() => {
        instanceById(engine, composite.id)
      }).not.toThrow()

      const currentStateString = getStateAsString(engine)
      const stateFilePath = `${COMPOSITE_BASE_PATH}/${composite.id}.scene-snapshot.json`
      const lastStateSavedString = existsSync(stateFilePath) ? readFileSync(stateFilePath).toString() : ''

      if (writeToFile) {
        writeFileSync(stateFilePath, currentStateString)
      }

      expect(currentStateString).toBe(lastStateSavedString)
    })
  })

  invalidComposites.forEach((composite) => {
    it(`should fail the instanciation '${composite.id}' composite`, () => {
      expect(() => {
        const engine = Engine()
        instanceById(engine, composite.id)
      }).toThrow()
    })
  })

  it(`should fail the instanciation without entity available`, () => {
    expect(() => {
      const engine = Engine()
      ;(engine as any).addEntity = () => null
      instanceById(engine, 'empty')
    }).toThrow()
  })
})

describe('composite from json function', () => {
  const invalidFalseValues = [null, undefined, false, 0]
  it(`should fail with non object or without id field`, () => {
    invalidFalseValues.forEach((value) => {
      expect(() => {
        compositeFromJson(value)
      }).toThrowError('Composite is not well defined')
    })
  })

  it(`should fail with defined object but without id file, or invalid id`, () => {
    ;[true, [], {}, 123, { sarasa: 33 }, { id: 213 }, { id: [234] }, { id: { asd: 'test' } }].forEach((value) => {
      expect(() => {
        compositeFromJson(value)
      }).toThrowError("Composite doesn't have a valid `id` field")
    })
  })

  it(`should fail with invalid and non-array component `, () => {
    const values = [
      { id: 'test' },
      ...invalidFalseValues.map((item) => ({ id: 'test', components: item })),
      { id: 'test', components: { test: 'asd' } }
    ]
    values.forEach((json) => {
      expect(() => {
        compositeFromJson(json)
      }).toThrowError(`Composite 'test' fields 'components' is not an array`)
    })
  })

  it(`should fail with invalid component (name)`, () => {
    const values = [
      { id: 'test', components: [{ test: 'asd' }] },
      { id: 'test', components: [{ name: [] }] }
    ]
    values.forEach((json) => {
      expect(() => {
        compositeFromJson(json)
      }).toThrowError(`Composite 'test': The component doesn't have a valid name`)
    })
  })

  it(`should fail with invalid component (data)`, () => {
    const values = [
      { id: 'test', components: [{ name: 'no-core', data: [] }] },
      { id: 'test', components: [{ name: 'no-core', data: 'string' }] }
    ]
    values.forEach((json) => {
      expect(() => {
        compositeFromJson(json)
      }).toThrowError(`Composite 'test': Invalid data in component 'no-core'`)
    })
  })

  it(`should parse json composite`, () => {
    const values = [{ id: 'test', components: [{ name: 'no-core', data: { '1111': 'test' } }] }]
    values.forEach((json) => {
      expect(() => {
        compositeFromJson(json)
      }).not.toThrow()
    })
  })
})
