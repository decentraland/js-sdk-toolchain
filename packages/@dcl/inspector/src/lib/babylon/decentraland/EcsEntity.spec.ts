import * as BABYLON from '@babylonjs/core'
import { Entity, Transform, Engine, IEngine } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'

import { EcsEntity } from './EcsEntity'
import { SceneContext } from './SceneContext'

const getContext = () => ({
  componentPutOperations: {
    [Transform.componentId]: jest.fn()
  },
  engine: {
    RootEntity: 0 as Entity
  }
})

type MockSceneContextType = SceneContext & { deref: () => ReturnType<typeof getContext> }

describe('EcsEntity', () => {
  let engine: IEngine
  let entity: EcsEntity
  let entityId: Entity
  let mockedContext: ReturnType<typeof getContext>
  let context: MockSceneContextType
  let scene: BABYLON.Scene

  beforeEach(() => {
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
  })

  afterEach(() => {
    entity.dispose()
  })

  it('should set constructor properties correctly', () => {
    expect(entity.entityId).toBe(entityId)
    expect(entity.context.deref()).toBe(mockedContext)
    expect(entity.scene).toBe(scene)
    expect(entity.isDCLEntity).toBe(true)
    expect(entity.usedComponents.size).toBe(0)
    expect(entity.meshRenderer).toBeUndefined()
    expect(entity.gltfContainer).toBeUndefined()
    expect(entity.gltfAssetContainer).toBeUndefined()
    expect(entity.ecsComponentValues).toEqual({})
    expect(entity.name).toBe(`ecs-${entityId.toString(16)}`)
    expect(scene.getTransformNodeByID(entity.id)).toBe(entity)
  })

  it('should add component with putComponent correctly', () => {
    const Transform = components.Transform(engine)
    entity.putComponent(Transform)
    expect(entity.usedComponents.size).toBe(1)
    expect(entity.usedComponents.get(Transform.componentId)).toBe(Transform)
    expect(mockedContext.componentPutOperations[Transform.componentId]).toBeCalledWith(entity, Transform)
  })

  it('should remove component with deleteComponent correctly', () => {
    const Transform = components.Transform(engine)
    entity.deleteComponent(Transform)
    expect(entity.usedComponents.size).toBe(0)
    expect(mockedContext.componentPutOperations[Transform.componentId]).toBeCalledWith(entity, Transform)
  })

  it('components and native engine', () => {
    const component1 = components.Transform(engine)
    const component2 = components.Billboard(engine)
    entity.putComponent(component1)
    entity.putComponent(component2)
    const deleteComponentMock = jest.spyOn(entity, 'deleteComponent')

    entity.dispose()

    expect(deleteComponentMock).toHaveBeenCalledTimes(2)
    expect(deleteComponentMock).toHaveBeenCalledWith(component1)
    expect(deleteComponentMock).toHaveBeenCalledWith(component2)
    expect(scene.getTransformNodeByID(entity.id)).toBeNull()
  })

  it('isGltfPathLoading: should return true when gltfPathLoadingis set', () => {
    entity.setGltfPathLoading()
    expect(entity.isGltfPathLoading()).toBe(true)
  })

  it('isGltfPathLoading: should return false when gltfPathLoading is not set', () => {
    expect(entity.isGltfPathLoading()).toBe(false)
  })

  it('getGltfPathLoading: should return non-undefined gltfPathLoading', () => {
    entity.setGltfPathLoading()
    const gltfPathLoading = entity.getGltfPathLoading()
    expect(gltfPathLoading).toBeDefined()
  })

  it('resolveGltfPathLoading: should resolve gltfPathLoading', async () => {
    entity.setGltfPathLoading()
    const filePath = 'some-path'
    setTimeout(() => entity.resolveGltfPathLoading(filePath), 1)
    const gltfPathLoading = await entity.getGltfPathLoading()
    expect(gltfPathLoading).toBe(filePath)
    expect(entity.isGltfPathLoading()).toBe(false)
  })
})
