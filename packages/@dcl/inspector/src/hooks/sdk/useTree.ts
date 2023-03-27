import { Entity } from '@dcl/ecs'
import { useCallback, useState } from 'react'
import { getNextFreeEntity } from '../../lib/sdk/engine'
import { getEmptyTree, getTreeFromEngine } from '../../lib/sdk/tree'
import { useChange } from './useChange'
import { useSdk } from './useSdk'

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

  const getId = (entity: Entity) => entity.toString()

  const getChildren = (entity: Entity): Entity[] => {
    const children = tree.get(entity)
    return children ? Array.from(children) : []
  }

  const getLabel = (entity: Entity) => {
    const { Label } = sdk!.components
    return Label.has(entity) ? Label.get(entity).label : entity.toString()
  }

  const isOpen = (entity: Entity) => {
    const { Toggle } = sdk!.components
    return Toggle.has(entity)
  }

  const isSelected = (entity: Entity) => {
    const { EntitySelected } = sdk!.components
    return EntitySelected.has(entity)
  }

  const addChild = async (parent: Entity, label: string) => {
    const { Transform, Label } = sdk!.components
    const child = getNextFreeEntity(sdk!.engine)
    Transform.create(child, { parent })
    Label.create(child, { label })
    handleUpdate()
  }

  const setParent = async (entity: Entity, parent: Entity) => {
    const { Transform, Toggle } = sdk!.components
    const transform = Transform.getMutable(entity)
    transform.parent = parent
    Toggle.createOrReplace(parent)
    handleUpdate()
  }

  const rename = async (entity: Entity, label: string) => {
    const { Label } = sdk!.components
    Label.createOrReplace(entity, { label })
    handleUpdate()
  }

  const remove = async (entity: Entity) => {
    sdk!.engine.removeEntity(entity)
    handleUpdate()
  }

  const toggle = async (entity: Entity, open: boolean) => {
    const { Toggle, EntitySelected } = sdk!.components
    for (const [_entity] of sdk!.engine.getEntitiesWith(EntitySelected)) {
      if (_entity !== entity) {
        EntitySelected.deleteFrom(_entity)
      }
    }
    EntitySelected.createOrReplace(entity, { gizmo: 1 })

    if (open) {
      Toggle.createOrReplace(entity)
    } else {
      Toggle.deleteFrom(entity)
    }

    handleUpdate()
  }

  return { tree, addChild, setParent, rename, remove, toggle, getId, getChildren, getLabel, isOpen, isSelected }
}
