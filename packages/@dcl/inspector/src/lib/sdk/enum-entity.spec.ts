import { IEngine, NetworkEntity as NetworkEntityEngine, Entity } from '@dcl/ecs'
import { createEnumEntityId, EnumEntity } from './enum-entity'

describe('createEnumEntityId', () => {
  it('returns functions to get and increment enum entity id', () => {
    const engineMock: IEngine = {
      getComponent: jest.fn(),
      getEntitiesWith: jest.fn()
    } as any as IEngine

    const mockNetworkEntity = (entityId: number) => ({
      entityId
    })

    const networkEntityComponent = mockNetworkEntity(1111)
    ;(engineMock.getComponent as jest.Mock).mockReturnValue(networkEntityComponent)

    const entitiesWithMock = new Map([
      [1, { entityId: 2222 }],
      [2, { entityId: 3333 }]
    ])

    ;(engineMock.getEntitiesWith as jest.Mock).mockImplementation((component: typeof NetworkEntityEngine) => {
      const result: Entity[] = []
      entitiesWithMock.forEach((_, key) => {
        if (component === NetworkEntityEngine) {
          result.push(key as Entity)
        }
      })
      return result
    })

    const enumEntity: EnumEntity = createEnumEntityId(engineMock)

    expect(enumEntity.getEnumEntityId()).toBe(3333)
    expect(enumEntity.getNextEnumEntityId()).toBe(3334)
  })
})
