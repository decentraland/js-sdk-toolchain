import { Engine, Entity, IEngine } from '@dcl/ecs'
import { ActionType } from '@dcl/asset-packs'
import { addSyncComponentsToEntities, getEntitiesSyncStatus, removeSyncComponentsFromEntities } from './entitySyncUtils'
import { createOperations } from './index'
import { SdkContextValue } from '../context'
import { createComponents, createEditorComponents, EditorComponents, SdkComponents } from '../components'
import { createEnumEntityId } from '../enum-entity'

describe('entitySyncUtils', () => {
  let engine: IEngine
  let operations: ReturnType<typeof createOperations>
  let sdk: SdkContextValue
  let components: EditorComponents & SdkComponents
  let dispatchMock: jest.Mock

  beforeEach(() => {
    engine = Engine()
    // Create components
    components = {
      ...createComponents(engine),
      ...createEditorComponents(engine)
    }
    // Create operations
    dispatchMock = jest.fn().mockResolvedValue(undefined)
    operations = createOperations(engine)
    operations.dispatch = dispatchMock

    sdk = {
      engine,
      operations,
      components,
      enumEntity: createEnumEntityId(engine)
    } as SdkContextValue
  })

  describe('addSyncComponentsToEntities', () => {
    it('should return an empty object for empty entities array', () => {
      const result = addSyncComponentsToEntities(sdk, [])
      expect(result).toEqual({})
      expect(dispatchMock).not.toHaveBeenCalled()
    })

    it('should add SyncComponents and NetworkEntity to entities with valid components', () => {
      const entities = [512, 513, 514, 515] as Entity[]
      sdk.components.Animator.create(entities[1])
      sdk.components.Animator.create(entities[3])
      const result = addSyncComponentsToEntities(
        sdk,
        [entities[0], entities[1], entities[2], entities[3]],
        [sdk.components.Animator.componentId]
      )

      // Entity 0 doesn't have Animator, should fail
      expect(result[entities[0]]).toBe(false)

      // Entity 1 has Animator, should succeed
      expect(result[entities[1]]).toBe(true)

      // Entity 2 doesn't have Animator, should fail
      expect(result[entities[2]]).toBe(false)

      // Entity 3 doesn't have Animator directly but has Actions referencing it, should succeed
      expect(result[entities[3]]).toBe(true)

      // Verify component operations
      expect(sdk.components.SyncComponents.has(entities[1])).toBe(true)
      expect(sdk.components.NetworkEntity.has(entities[1])).toBe(true)
      expect(sdk.components.SyncComponents.has(entities[3])).toBe(true)
      expect(sdk.components.NetworkEntity.has(entities[3])).toBe(true)
      // Dispatch should be called once
      expect(dispatchMock).toHaveBeenCalledTimes(1)
    })

    it('should update existing SyncComponents with new component IDs', () => {
      const entity = 512 as Entity
      // First create the Animator component
      sdk.components.Animator.create(entity)

      // Then add SyncComponents with Animator
      sdk.components.SyncComponents.create(entity, { componentIds: [sdk.components.Animator.componentId] })
      sdk.components.NetworkEntity.create(entity, { entityId: sdk.enumEntity.getNextEnumEntityId(), networkId: 0 })

      // Then create the States component
      sdk.components.States.create(entity)

      // Before adding States, check what's in SyncComponents
      expect(sdk.components.SyncComponents.get(entity).componentIds).toEqual([sdk.components.Animator.componentId])

      // Try to add States
      const result = addSyncComponentsToEntities(sdk, [entity], [sdk.components.States.componentId])

      // Should add successfully
      expect(result[entity]).toBe(true)

      // Verify SyncComponents was updated to include both components
      expect(sdk.components.SyncComponents.get(entity).componentIds).toContain(sdk.components.Animator.componentId)
      expect(sdk.components.SyncComponents.get(entity).componentIds).toContain(sdk.components.States.componentId)

      // Dispatch should be called once
      expect(dispatchMock).toHaveBeenCalledTimes(1)
    })

    it('should not update if component IDs already exist in SyncComponents', () => {
      const entity = 512 as Entity
      // First create the Animator component
      sdk.components.Animator.create(entity)

      // Then add SyncComponents with Animator
      sdk.components.SyncComponents.create(entity, { componentIds: [sdk.components.Animator.componentId] })
      sdk.components.NetworkEntity.create(entity, { entityId: sdk.enumEntity.getNextEnumEntityId(), networkId: 0 })

      // Then try to add Animator again
      const result = addSyncComponentsToEntities(sdk, [entity], [sdk.components.Animator.componentId])

      // Should return false as no changes were made
      expect(result[entity]).toBe(false)

      // Dispatch should not be called
      expect(dispatchMock).not.toHaveBeenCalled()
    })

    it('should detect components implied by Actions', () => {
      const entity = 512 as Entity
      // Create the Animator and States components first since entitySyncUtils checks for them
      sdk.components.Animator.create(entity)
      sdk.components.States.create(entity)

      // Add Actions component that references Animator and States
      sdk.components.Actions.create(entity, {
        id: 1,
        value: [
          {
            name: 'Play Walk Animation',
            type: ActionType.PLAY_ANIMATION,
            jsonPayload: JSON.stringify({
              animation: 'walk'
            })
          },
          {
            name: 'Set On',
            type: ActionType.SET_STATE,
            jsonPayload: JSON.stringify({
              state: 'on'
            })
          }
        ]
      })

      // Try to sync all components on entity 3 which has Actions referencing Animator and States
      const result = addSyncComponentsToEntities(
        sdk,
        [entity],
        [sdk.components.Animator.componentId, sdk.components.States.componentId, sdk.components.Tween.componentId]
      )

      // Should succeed because entity has the components
      expect(result[entity]).toBe(true)

      // Check that SyncComponents was added with the correct IDs
      expect(sdk.components.SyncComponents.has(entity)).toBe(true)
      expect(sdk.components.SyncComponents.get(entity).componentIds).toContain(sdk.components.Animator.componentId)
      expect(sdk.components.SyncComponents.get(entity).componentIds).toContain(sdk.components.States.componentId)

      // Shouldn't include Tween which isn't on the entity
      expect(sdk.components.SyncComponents.get(entity).componentIds).not.toContain(sdk.components.Tween.componentId)

      // Dispatch should be called once
      expect(dispatchMock).toHaveBeenCalledTimes(1)
    })

    it('should prioritize Tween over Transform when adding both to a new SyncComponent', () => {
      const entity = 512 as Entity
      // Create both Transform and Tween components
      sdk.components.Transform.create(entity)
      sdk.components.Tween.create(entity)

      // Try to sync both components
      const result = addSyncComponentsToEntities(
        sdk,
        [entity],
        [sdk.components.Transform.componentId, sdk.components.Tween.componentId]
      )

      // Should succeed
      expect(result[entity]).toBe(true)

      // Should have added SyncComponents with Tween, but not Transform
      expect(sdk.components.SyncComponents.has(entity)).toBe(true)
      expect(sdk.components.SyncComponents.get(entity).componentIds).toContain(sdk.components.Tween.componentId)
      expect(sdk.components.SyncComponents.get(entity).componentIds).not.toContain(sdk.components.Transform.componentId)

      // Dispatch should be called once
      expect(dispatchMock).toHaveBeenCalledTimes(1)
    })

    it('should not add Tween to SyncComponents that already contain Transform', () => {
      const entity = 512 as Entity
      // Create both Transform and Tween components
      sdk.components.Transform.create(entity)
      sdk.components.Tween.create(entity)

      // First add Transform to SyncComponents
      sdk.components.SyncComponents.create(entity, { componentIds: [sdk.components.Transform.componentId] })
      sdk.components.NetworkEntity.create(entity, { entityId: sdk.enumEntity.getNextEnumEntityId(), networkId: 0 })

      // Now try to add Tween
      const result = addSyncComponentsToEntities(sdk, [entity], [sdk.components.Tween.componentId])

      // Should not add Tween since Transform already exists
      expect(result[entity]).toBe(false)
      expect(sdk.components.SyncComponents.get(entity).componentIds).toContain(sdk.components.Transform.componentId)
      expect(sdk.components.SyncComponents.get(entity).componentIds).not.toContain(sdk.components.Tween.componentId)

      // Dispatch should not be called
      expect(dispatchMock).not.toHaveBeenCalled()
    })

    it('should not add Transform to SyncComponents that already contain Tween', () => {
      const entity = 512 as Entity
      // Create both Transform and Tween components
      sdk.components.Transform.create(entity)
      sdk.components.Tween.create(entity)

      // First add Tween to SyncComponents
      sdk.components.SyncComponents.create(entity, { componentIds: [sdk.components.Tween.componentId] })
      sdk.components.NetworkEntity.create(entity, { entityId: sdk.enumEntity.getNextEnumEntityId(), networkId: 0 })

      // Now try to add Transform
      const result = addSyncComponentsToEntities(sdk, [entity], [sdk.components.Transform.componentId])

      // Should not add Transform since Tween already exists
      expect(result[entity]).toBe(false)
      expect(sdk.components.SyncComponents.get(entity).componentIds).toContain(sdk.components.Tween.componentId)
      expect(sdk.components.SyncComponents.get(entity).componentIds).not.toContain(sdk.components.Transform.componentId)

      // Dispatch should not be called
      expect(dispatchMock).not.toHaveBeenCalled()
    })
  })

  describe('removeSyncComponentsFromEntities', () => {
    it('should return an empty object for empty entities array', async () => {
      const result = await removeSyncComponentsFromEntities(sdk, [])
      expect(result).toEqual({})
      expect(dispatchMock).not.toHaveBeenCalled()
    })

    it('should remove SyncComponents and NetworkEntity from entities', async () => {
      const entities = [512, 513] as Entity[]
      // Add SyncComponents and NetworkEntity to entities
      sdk.components.SyncComponents.create(entities[0], { componentIds: [sdk.components.Animator.componentId] })
      sdk.components.NetworkEntity.create(entities[0], { entityId: sdk.enumEntity.getNextEnumEntityId(), networkId: 0 })

      // Make sure they exist
      expect(sdk.components.SyncComponents.has(entities[0])).toBe(true)
      expect(sdk.components.NetworkEntity.has(entities[0])).toBe(true)

      // Remove them
      const result = await removeSyncComponentsFromEntities(sdk, [entities[0], entities[1]])

      // Entity 0 had components, should return true
      expect(result[entities[0]]).toBe(true)

      // Entity 1 didn't have components, should return false
      expect(result[entities[1]]).toBe(false)

      // Verify components were actually removed
      expect(sdk.components.SyncComponents.has(entities[0])).toBe(false)
      expect(sdk.components.NetworkEntity.has(entities[0])).toBe(false)

      // Dispatch should be called once
      expect(dispatchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('getEntitiesSyncStatus', () => {
    it('should return sync status for entities', () => {
      const entities = [512, 513] as Entity[]
      // Add SyncComponents and NetworkEntity to entity 1
      sdk.components.SyncComponents.create(entities[1], {
        componentIds: [sdk.components.Animator.componentId, sdk.components.States.componentId]
      })
      sdk.components.NetworkEntity.create(entities[1], { entityId: sdk.enumEntity.getNextEnumEntityId(), networkId: 0 })

      // Get status for all entities
      const result = getEntitiesSyncStatus(sdk, entities)

      // Entity 0 should have no components
      expect(result[entities[0]]).toEqual({
        hasSyncComponents: false,
        hasNetworkEntity: false,
        syncComponentIds: []
      })

      // Entity 1 should have both components
      expect(result[entities[1]]).toEqual({
        hasSyncComponents: true,
        hasNetworkEntity: true,
        syncComponentIds: [sdk.components.Animator.componentId, sdk.components.States.componentId]
      })
    })
  })
})
