import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { FiHexagon } from 'react-icons/fi'

import { CAMERA, PLAYER, ROOT } from '../../lib/sdk/tree'
import { useEntitiesWith } from '../../hooks/sdk/useEntitiesWith'
import { useTree } from '../../hooks/sdk/useTree'
import { Tree } from '../Tree'
import { ContextMenu } from './ContextMenu'
import './Hierarchy.css'

function HierarchyIcon({ value }: { value: Entity }) {
  if (value === ROOT) {
    return <span style={{ marginRight: '4px' }}></span>
  } else if (value === PLAYER) {
    return <span className="tree-icon player-icon"></span>
  } else if (value === CAMERA) {
    return <span className="tree-icon camera-icon"></span>
  } else {
    return <FiHexagon style={{ marginRight: '4px' }} />
  }
}

const EntityTree = Tree<Entity>()

const Hierarchy: React.FC = () => {
  const {
    addChild,
    setParent,
    remove,
    rename,
    select,
    setOpen,
    duplicate,
    getId,
    getChildren,
    getLabel,
    isOpen,
    isHidden,
    canRename,
    canRemove,
    canDuplicate,
    canDrag,
    canReorder,
    centerViewOnEntity
  } = useTree()
  const selectedEntities = useEntitiesWith((components) => components.Selection)

  const isSelected = useCallback(
    (entity: Entity) => {
      return selectedEntities.includes(entity)
    },
    [selectedEntities]
  )

  const props = {
    getExtraContextMenu: ContextMenu,
    onAddChild: addChild,
    onDrop: setParent,
    onRemove: remove,
    onRename: rename,
    onSelect: select,
    onDoubleSelect: centerViewOnEntity,
    onSetOpen: setOpen,
    onDuplicate: duplicate,
    getId: getId,
    getChildren: getChildren,
    getLabel: getLabel,
    getIcon: (val: Entity) => <HierarchyIcon value={val} />,
    isOpen: isOpen,
    isSelected: isSelected,
    isHidden: isHidden,
    canRename: canRename,
    canRemove: canRemove,
    canDuplicate: canDuplicate,
    canDrag: canDrag,
    canReorder: canReorder
  }

  return (
    <div className="Hierarchy">
      <EntityTree value={PLAYER} {...props} />
      <EntityTree value={CAMERA} {...props} />
      <EntityTree value={ROOT} {...props} />
    </div>
  )
}

export default React.memo(Hierarchy)
