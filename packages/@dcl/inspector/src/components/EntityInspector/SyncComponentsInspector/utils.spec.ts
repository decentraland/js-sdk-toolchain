import { ComponentDefinition, Entity, IEngine } from '@dcl/ecs'
import { ComponentName } from '@dcl/asset-packs'

import { CoreComponents } from '../../../lib/sdk/components'
import { getComponents, putComponentIds, deleteComponentIds, POTENTIAL_COMPONENTS } from './utils'
import { getComponentName } from '../../../hooks/sdk/useEntityComponent'

describe('getComponents', () => {
  it('returns sorted entity components and available components', () => {
    const engineMock: IEngine = {
      getComponent: jest.fn(),
      componentsIter: jest.fn()
    } as any as IEngine

    const mockActionComponent = () => ({
      has: jest.fn(() => true)
    })

    const mockComponent = (name: string, id: number, has = () => false) => ({
      componentName: name,
      componentId: id,
      has: jest.fn(has)
    })

    const componentsIterMock = [
      mockComponent(CoreComponents.VIDEO_PLAYER, 3, () => true),
      mockComponent(CoreComponents.ANIMATOR, 1, () => true),
      mockComponent(CoreComponents.MESH_COLLIDER, 6),
      mockComponent(CoreComponents.GLTF_CONTAINER, 4),
      mockComponent(ComponentName.ACTIONS, 5),
      mockComponent(CoreComponents.AUDIO_SOURCE, 2)
    ]

    ;(engineMock.getComponent as jest.Mock).mockImplementation(mockActionComponent)
    ;(engineMock.componentsIter as jest.Mock).mockReturnValue(componentsIterMock)

    const [entityComponents, availableComponents] = getComponents(123 as Entity, engineMock)

    expect(entityComponents).toEqual([
      {
        name: CoreComponents.ANIMATOR,
        displayName: getComponentName(CoreComponents.ANIMATOR),
        id: 1,
        potential: undefined
      },
      {
        name: CoreComponents.AUDIO_SOURCE,
        displayName: getComponentName(CoreComponents.AUDIO_SOURCE),
        id: 2,
        potential: true
      },
      {
        name: CoreComponents.VIDEO_PLAYER,
        displayName: getComponentName(CoreComponents.VIDEO_PLAYER),
        id: 3,
        potential: undefined
      }
    ])
    expect(availableComponents).toEqual([
      {
        name: CoreComponents.GLTF_CONTAINER,
        displayName: getComponentName(CoreComponents.GLTF_CONTAINER),
        id: 4,
        potential: undefined
      },
      {
        name: CoreComponents.MESH_COLLIDER,
        displayName: getComponentName(CoreComponents.MESH_COLLIDER),
        id: 6,
        potential: undefined
      }
    ])
  })
})

describe('putComponentIds', () => {
  it('adds component ids for ACTIONS component', () => {
    const mockComponent = (name: string, id: number) =>
      ({
        componentName: name,
        componentId: id
      } as any as ComponentDefinition<unknown>)

    const componentsIterMock = POTENTIAL_COMPONENTS.map(($, id) => mockComponent($, id))

    const engineMock: IEngine = {
      getComponent: jest.fn((name: string) => {
        return componentsIterMock.find(($) => $.componentName === name)
      })
    } as any as IEngine

    const actionsComponent = mockComponent(ComponentName.ACTIONS, 10)

    const result = putComponentIds(engineMock, [11, 12], actionsComponent)

    expect(result).toEqual([11, 12, ...componentsIterMock.map(($) => $.componentId), 10])
  })

  it('adds component ids for other components', () => {
    const engineMock: IEngine = {
      getComponent: jest.fn()
    } as any as IEngine

    const mockComponent = (name: string, id: number) =>
      ({
        componentName: name,
        componentId: id
      } as any as ComponentDefinition<unknown>)

    const otherComponent = mockComponent('OTHER_COMPONENT', 1)
    ;(engineMock.getComponent as jest.Mock).mockReturnValue(otherComponent)

    const result = putComponentIds(engineMock, [2, 3], otherComponent)

    expect(result).toEqual([2, 3, 1])
  })
})

describe('deleteComponentIds', () => {
  it('deletes component ids for ACTIONS component', () => {
    const mockComponent = (name: string, id: number, has = () => false) =>
      ({
        componentName: name,
        componentId: id,
        has: jest.fn(has)
      } as any as ComponentDefinition<unknown>)

    // component CoreComponents.ANIMATOR is potential and also is applied to the entity...
    const componentsIterMock = POTENTIAL_COMPONENTS.map(($, id) =>
      mockComponent($, $ === CoreComponents.ANIMATOR ? 999 : id, () => $ === CoreComponents.ANIMATOR)
    )

    const engineMock: IEngine = {
      getComponent: jest.fn((name: string) => {
        return componentsIterMock.find(($) => $.componentName === name)
      })
    } as any as IEngine

    const actionsComponent = mockComponent(ComponentName.ACTIONS, 10)

    const ids = [11, 12, 999, ...componentsIterMock.map(($) => $.componentId)]
    const result = deleteComponentIds(engineMock, 123 as Entity, ids, actionsComponent)

    expect(result).toEqual([11, 12, 999])
  })

  it('deletes component ids for other components', () => {
    const engineMock: IEngine = {
      getComponent: jest.fn()
    } as any as IEngine

    const mockComponent = (name: string, id: number) =>
      ({
        componentName: name,
        componentId: id
      } as any as ComponentDefinition<unknown>)

    const otherComponent = mockComponent('OTHER_COMPONENT', 1)
    ;(engineMock.getComponent as jest.Mock).mockReturnValue(otherComponent)

    const result = deleteComponentIds(engineMock, 123 as Entity, [1, 2, 3], otherComponent)

    expect(result).toEqual([2, 3])
  })
})
