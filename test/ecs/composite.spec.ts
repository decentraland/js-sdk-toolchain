import { existsSync, readFileSync, writeFileSync } from 'fs'
import glob from 'glob'
import {
  Composite,
  Engine,
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  EntityMappingMode
} from './../../packages/@dcl/ecs/src'
import { getCompositeRootComponent } from './../../packages/@dcl/ecs/src/composite'
import { getComponentDefinition, getComponentValue } from './../../packages/@dcl/ecs/src/composite/instance'
import { ReadWriteByteBuffer } from './../../packages/@dcl/ecs/src/serialization/ByteBuffer'

const writeToFile = process.env.UPDATE_SNAPSHOTS
const COMPOSITE_BASE_PATH = 'test/ecs/composites'

// ########
// ## Helpers
// ########

function getJsonCompositeFrom(globPath: string) {
  const compositeFileContent = glob.sync(globPath, { absolute: true }).map((item) => readFileSync(item).toString())
  return compositeFileContent.map((item) => Composite.fromJson(JSON.parse(item)))
}

function getBinaryCompositeFrom(globPath: string) {
  const compositeFileContent = glob.sync(globPath, { absolute: true }).map((item) => readFileSync(item))
  return compositeFileContent.map((item) => Composite.fromBinary(new Uint8Array(item)))
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

/**
 * Mutate the composite to hold binary data
 * @param composite
 */
function convertCompositeComponentDataToBinary(composite: Composite) {
  const engine = Engine()
  getCompositeRootComponent(engine)
  for (const component of composite.components) {
    const componentDefinition: LastWriteWinElementSetComponentDefinition<unknown> = getComponentDefinition(
      engine,
      component
    )

    for (const [, item] of component.data) {
      if (item.data?.$case === 'json') {
        const buf = new ReadWriteByteBuffer()
        const value = componentDefinition.createOrReplace(0 as Entity, getComponentValue(componentDefinition, item))
        componentDefinition.schema.serialize(value as any, buf)
        item.data = {
          $case: 'binary',
          binary: buf.toBinary()
        }
      }
    }
  }
}

// ########
// ## Helper-test
// ########

describe.skip('convert non-binary.composite.json', () => {
  const composite = getJsonCompositeFrom(`${COMPOSITE_BASE_PATH}/non-binary.composite.json`)
  const binaryComposite = composite[0]
  convertCompositeComponentDataToBinary(binaryComposite)

  binaryComposite.id = 'data-binary'
  writeFileSync(
    `${COMPOSITE_BASE_PATH}/data-binary.composite.json`,
    JSON.stringify(Composite.toJson(binaryComposite), null, 2)
  )

  binaryComposite.id = 'full-binary'
  const buffer = Composite.toBinary(binaryComposite)
  writeFileSync(`${COMPOSITE_BASE_PATH}/full-binary.composite`, buffer)
})

// ########
// ## Tests
// ########

describe('composite instantiation system', () => {
  const validComposites = [
    ...getJsonCompositeFrom(`${COMPOSITE_BASE_PATH}/*.composite.json`),
    ...getBinaryCompositeFrom(`${COMPOSITE_BASE_PATH}/*.composite`)
  ]
  const invalidComposites = getJsonCompositeFrom(`${COMPOSITE_BASE_PATH}/invalid/*.composite.json`)
  const composites = [...validComposites, ...invalidComposites]
  const compositeProvider: Composite.Provider = {
    getCompositeOrNull(id: string) {
      return composites.find((item) => item.id === id) || null
    }
  }

  function instanceById(engine: IEngine, id: string, rootEntity?: Entity, alreadyRequestedId?: Set<string>) {
    const composite = compositeProvider.getCompositeOrNull(id)
    if (!composite) {
      throw new Error(`Composite ${id} not found`)
    }

    if (rootEntity || alreadyRequestedId) {
      Composite.instance(engine, composite, compositeProvider, { rootEntity, alreadyRequestedId })
    } else {
      Composite.instance(engine, composite, compositeProvider)
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

  describe(`should work with a entity offset`, () => {
    it('with EMM_NEXT_AVAILABLE option', () => {
      const engine = Engine()
      const composite = compositeProvider.getCompositeOrNull('2-level-deep')!

      const entityOffset = 10000

      let counter = entityOffset
      Composite.instance(engine, composite, compositeProvider, {
        entityMapping: {
          type: EntityMappingMode.EMM_NEXT_AVAILABLE,
          getNextAvailableEntity: () => counter++ as Entity
        }
      })
      const entities = []
      for (const compDef of engine.componentsIter()) {
        for (const [entity, _] of compDef.iterator()) {
          entities.push(entity)
        }
      }

      expect(entities.filter((item) => item < entityOffset)).toStrictEqual([])
    })

    it('with EMM_DIRECT_MAPPING option', () => {
      const engine = Engine()
      const composite = compositeProvider.getCompositeOrNull('2-level-deep')!

      const entityOffset = 20000
      Composite.instance(engine, composite, compositeProvider, {
        entityMapping: {
          type: EntityMappingMode.EMM_DIRECT_MAPPING,
          getCompositeEntity: (compositeEntity: Entity | number) => (entityOffset + compositeEntity) as Entity
        }
      })
      const entities: Set<Entity> = new Set()
      for (const compDef of engine.componentsIter()) {
        for (const [entity, _] of compDef.iterator()) {
          entities.add(entity)
        }
      }

      const subCompositesEntities = Array.from(entities).filter((item) => item < entityOffset)
      const mainCompositeEntity = Array.from(entities).filter((item) => item >= entityOffset)

      // This number remains from the composite definition, see '2-level-deep' and count the entities that should be created :)
      expect(subCompositesEntities.length).toBe(7) // the sub composite entities
      expect(mainCompositeEntity.length).toBe(5) // only CompositeRoot (children and the root)
    })
  })
})

describe('composite serialization', () => {
  const validComposites = [
    ...getJsonCompositeFrom(`${COMPOSITE_BASE_PATH}/*.composite.json`),
    ...getBinaryCompositeFrom(`${COMPOSITE_BASE_PATH}/*.composite`)
  ]

  describe('should serialize to binary and get the same composite', () => {
    const composite = validComposites.find((item) => item.id === 'non-binary-composite')!
    const unpackedComposite = Composite.fromBinary(Composite.toBinary(composite))

    it('in binary', () => {
      expect(Composite.toBinary(composite)).toStrictEqual(Composite.toBinary(unpackedComposite))
    })

    it('raw', () => {
      expect(composite).toStrictEqual(unpackedComposite)
    })
  })

  describe('should serialize to json and get the same composite', () => {
    const composite = validComposites.find((item) => item.id === 'non-binary-composite')!
    const unpackedComposite = Composite.fromBinary(Composite.toBinary(composite))

    it('in json (raw)', () => {
      expect(Composite.toJson(composite)).toStrictEqual(Composite.toJson(unpackedComposite))
    })

    it('in json (string)', () => {
      expect(JSON.stringify(Composite.toJson(composite))).toBe(JSON.stringify(Composite.toJson(unpackedComposite)))
    })

    it('raw', () => {
      expect(composite).toStrictEqual(unpackedComposite)
    })
  })
})

// ########
// ## Mosly deprecated tests
// ########

describe('composite from json function', () => {
  const invalidFalseValues = [null, undefined, false, 0]

  // TODO: the Composite.fromJson doesn't pannic, but the resulting Composite should be validated
  describe.skip(`should fail with non object or without id field: `, () => {
    invalidFalseValues.forEach((value) => {
      it(`${value}`, () => {
        expect(() => {
          Composite.fromJson(value)
        }).toThrow()
      })
    })
  })

  // TODO: the Composite.fromJson doesn't pannic, but the resulting Composite should be validated
  describe.skip(`should fail with defined object but without id file, or invalid id: `, () => {
    ;[true, [], {}, 123, { sarasa: 33 }, { id: 213 }, { id: [234] }, { id: { asd: 'test' } }].forEach(
      (value, index) => {
        it(`[${index}] = ${value.toString()}`, () => {
          expect(() => {
            Composite.fromJson(value)
          }).toThrow()
        })
      }
    )
  })

  // TODO: the Composite.fromJson doesn't pannic, but the resulting Composite should be validated
  describe.skip(`should fail with invalid and non-array component `, () => {
    const values = [
      { id: 'test' },
      ...invalidFalseValues.map((item) => ({ id: 'test', components: item })),
      { id: 'test', components: { test: 'asd' } }
    ]
    values.forEach((json, index) => {
      it(`[${index}] = ${json.toString()}`, () => {
        expect(() => {
          Composite.fromJson(json)
        }).toThrow()
      })
    })
  })

  // TODO: the Composite.fromJson doesn't pannic, but the resulting Composite should be validated
  describe.skip(`should fail with invalid component (name)`, () => {
    const values = [
      { id: 'test', components: [{ test: 'asd' }] },
      { id: 'test', components: [{ name: [] }] }
    ]
    values.forEach((json, index) => {
      it(`[${index}] = ${json.toString()}`, () => {
        expect(() => {
          Composite.fromJson(json)
        }).toThrow()
      })
    })
  })

  // TODO: the Composite.fromJson doesn't pannic, but the resulting Composite should be validated
  describe.skip(`should fail with invalid component (data)`, () => {
    const values = [
      { id: 'test', components: [{ name: 'no-core', data: [] }] },
      { id: 'test', components: [{ name: 'no-core', data: 'string' }] }
    ]
    values.forEach((json, index) => {
      it(`[${index}] = ${json.toString()}`, () => {
        expect(() => {
          Composite.fromJson(json)
        }).toThrow()
      })
    })
  })

  it(`should parse json composite`, () => {
    const values = [{ id: 'test', components: [{ name: 'no-core', data: { '1111': 'test' } }] }]
    values.forEach((json) => {
      expect(() => {
        Composite.fromJson(json)
      }).not.toThrow()
    })
  })
})
