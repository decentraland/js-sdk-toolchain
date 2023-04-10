import { Entity } from '@dcl/ecs'
import { useCallback, useState } from 'react'
import { getEmptyTree, getTreeFromEngine, ROOT } from '../../lib/sdk/tree'
import { useChange } from './useChange'
import { useSdk } from './useSdk'
import { isLastWriteWinComponent } from './useComponentValue'

/**
 * Used to get a tree and the functions to work with it
 * @returns
 */
export const useTree = () => {
  const sdk = useSdk()

  // Generate a tree if the sdk is available, or an empty tree otherwise
  const getTree = useCallback(() => {
    if (sdk) {
      const {
        engine,
        components: { Transform }
      } = sdk
      return getTreeFromEngine(engine, Transform)
    } else {
      return getEmptyTree()
    }
  }, [sdk])

  const [tree, setTree] = useState(getTree())

  // Update tree when a change happens in the engine
  const handleUpdate = useCallback(() => setTree(getTree()), [setTree, getTree])
  useChange(handleUpdate)

  const getId = useCallback((entity: Entity) => entity.toString(), [])

  const getChildren = useCallback(
    (entity: Entity): Entity[] => {
      const children = tree.get(entity)
      return children ? Array.from(children) : []
    },
    [tree]
  )

  const getEntityComponents = useCallback(
    (entity: Entity, missing?: boolean): Map<number, string> => {
      const components = new Map<number, string>()
      if (sdk && entity !== ROOT) {
        for (const component of sdk.engine.componentsIter()) {
          if (missing ? !component.has(entity) : component.has(entity)) {
            components.set(component.componentId, component.componentName)
          }
        }
      }

      return components
    },
    [tree]
  )

  const getLabel = useCallback(
    (entity: Entity) => {
      if (entity === ROOT) return 'Root'
      if (!sdk) return entity.toString()
      const { Label } = sdk.components
      return Label.has(entity) ? Label.get(entity).label : entity.toString()
    },
    [sdk]
  )

  const isOpen = useCallback(
    (entity: Entity) => {
      if (entity === ROOT || !sdk) return true
      if (!sdk) return false
      const { Toggle } = sdk.components
      return Toggle.has(entity)
    },
    [sdk]
  )

  const isSelected = useCallback(
    (entity: Entity) => {
      if (entity === ROOT) return false
      if (!sdk) return false
      const { EntitySelected } = sdk.components
      return EntitySelected.has(entity)
    },
    [sdk]
  )

  const addChild = useCallback(
    (parent: Entity, label: string) => {
      if (!sdk) return
      const { Transform, Label } = sdk.components
      const child = sdk.engine.addEntity()
      Transform.create(child, { parent })
      Label.create(child, { label })
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const setParent = useCallback(
    (entity: Entity, parent: Entity) => {
      console.log('setParent', entity, parent)
      if (entity === ROOT || !sdk) return
      const { Transform, Toggle } = sdk.components
      const transform = Transform.getMutable(entity)
      transform.parent = parent
      Toggle.createOrReplace(parent)
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const rename = useCallback(
    (entity: Entity, label: string) => {
      if (entity === ROOT || !sdk) return
      const { Label } = sdk.components
      Label.createOrReplace(entity, { label })
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const remove = useCallback(
    (entity: Entity) => {
      if (entity === ROOT || !sdk) return
      sdk.engine.removeEntity(entity)
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const toggle = useCallback(
    (entity: Entity, open: boolean) => {
      if (entity === ROOT || !sdk) return
      const { Toggle, EntitySelected } = sdk.components
      for (const [_entity] of sdk.engine.getEntitiesWith(EntitySelected)) {
        if (_entity !== entity && EntitySelected.has(_entity)) {
          EntitySelected.deleteFrom(_entity)
        }
      }
      EntitySelected.createOrReplace(entity, { gizmo: 1 })

      if (open) {
        Toggle.createOrReplace(entity)
      } else if (Toggle.has(entity)) {
        Toggle.deleteFrom(entity)
      }

      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const addComponent = useCallback(
    (entity: Entity, componentId: number) => {
      if (!sdk || entity === ROOT) return
      const component = sdk.engine.getComponent(componentId)
      if (isLastWriteWinComponent(component)) {
        component.create(entity)
      }
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const isNotRoot = useCallback((entity: Entity) => entity !== ROOT, [])
  const canRename = isNotRoot
  const canRemove = isNotRoot
  const canToggle = isNotRoot

  return {
    tree,
    addComponent,
    addChild,
    setParent,
    rename,
    remove,
    toggle,
    getId,
    getChildren,
    getEntityComponents,
    getLabel,
    isOpen,
    isSelected,
    canRename,
    canRemove,
    canToggle
  }
}
