import * as BABYLON from '@babylonjs/core'
import { Entity, Transform, Engine, IEngine } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'

import * as fns from './gltf-container'
import { SceneContext } from '../SceneContext'
import { EcsEntity } from '../EcsEntity'

const getContext = () => ({
  componentPutOperations: {
    [Transform.componentId]: jest.fn()
  },
  loadableScene: {
    id: 'some-id'
  },
  engine: {
    RootEntity: 0 as Entity
  }
})

type MockSceneContextType = SceneContext & { deref: () => ReturnType<typeof getContext> }

const getGltfContainer = () => ({
  setEnabled: jest.fn(),
  parent: 'some-parent',
  dispose: jest.fn()
})

describe('gltf-container setup', () => {
  let engine: IEngine
  let entity: EcsEntity
  let entityId: Entity
  let mockedContext: ReturnType<typeof getContext>
  let context: MockSceneContextType
  let scene: BABYLON.Scene
  let gltfContainer: ReturnType<typeof getGltfContainer>

  beforeEach(() => {
    jest.restoreAllMocks()
    engine = Engine()
    entityId = 512 as Entity
    mockedContext = getContext()
    context = { deref: () => mockedContext } as unknown as MockSceneContextType
    scene = new BABYLON.Scene(
      new BABYLON.NullEngine({
        renderWidth: 512,
        renderHeight: 256,
        textureSize: 512,
        deterministicLockstep: true,
        lockstepMaxSteps: 4
      })
    )
    entity = new EcsEntity(entityId, context, scene)
    gltfContainer = getGltfContainer()
  })

  it('putGltfContainerComponent: should update entity correctly with LastWriteWinElementSet component', () => {
    const Transform = components.Transform(engine)
    Transform.create(entityId)
    entity.ecsComponentValues.gltfContainer = undefined
    fns.putGltfContainerComponent(entity, Transform)
    expect(entity.ecsComponentValues.gltfContainer).toStrictEqual(Transform.getOrNull(entity.entityId))
  })

  it('putGltfContainerComponent: should do nothing if component type is not LastWriteWinElementSet', () => {
    const Transform = components.Transform(engine)
    ;(Transform as any).componentType = 'other-type'
    ;(entity.ecsComponentValues.gltfContainer as any) = 'some-value'
    fns.putGltfContainerComponent(entity, Transform)

    expect(entity.ecsComponentValues.gltfContainer).toBe('some-value')
  })

  it('removeGltf: should remove gltfContainer correctly', () => {
    ;(entity.gltfContainer as any) = gltfContainer
    fns.removeGltf(entity)

    expect(gltfContainer.setEnabled).toBeCalledWith(false)
    expect(gltfContainer.parent).toBe(null)
    expect(gltfContainer.dispose).toBeCalled()
    expect(entity.gltfContainer).toBeUndefined()
  })

  it('removeGltf: should return early if context is missing', () => {
    ;(entity.gltfContainer as any) = gltfContainer
    entity.context.deref = jest.fn(() => null)
    fns.removeGltf(entity)

    expect(entity.gltfContainer).toBe(gltfContainer)
  })

  it('removeGltf: should not run removal actions if gltfContainer is missing on entity', () => {
    ;(entity.gltfContainer as any) = undefined
    entity.context.deref = jest.fn(() => null)
    fns.removeGltf(entity)

    expect(gltfContainer.setEnabled).not.toBeCalled()
    expect(gltfContainer.dispose).not.toBeCalled()
    expect(entity.gltfContainer).toBe(undefined)
  })
})
