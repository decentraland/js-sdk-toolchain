import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { FiHexagon } from 'react-icons/fi'

import { ROOT } from '../../lib/sdk/tree'
import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { useTree } from '../../hooks/sdk/useTree'
import { Tree } from '../Tree'
import { ContextMenu } from './ContextMenu'
import './Hierarchy.css'

function HierarchyIcon({ value }: { value: Entity }) {
  if (value === ROOT) {
    return <span style={{ marginRight: '4px' }}></span>
  } else {
    return (
      <FiHexagon style={{ marginRight: '4px' }}/>
    )
  }
}

const EntityTree = Tree<Entity>()

const Hierarchy: React.FC = () => {
  const { addChild, setParent, remove, rename, select, setOpen, getId, getChildren, getLabel, isOpen, isHidden, canRename, canRemove } =
    useTree()
  const selectedEntity = useSelectedEntity()

  const isSelected = useCallback(
    (entity: Entity) => {
      return selectedEntity === entity
    },
    [selectedEntity]
  )
  return (
    <div className="Hierarchy">
      <EntityTree
        value={ROOT}
        getExtraContextMenu={ContextMenu}
        onAddChild={addChild}
        onSetParent={setParent}
        onRemove={remove}
        onRename={rename}
        onSelect={select}
        onSetOpen={setOpen}
        getId={getId}
        getChildren={getChildren}
        getLabel={getLabel}
        getIcon={(val: Entity) => (
          <HierarchyIcon value={val} />
        )}
        isOpen={isOpen}
        isSelected={isSelected}
        isHidden={isHidden}
        canRename={canRename}
        canRemove={canRemove}
      />
    </div>
  )
}

export default React.memo(Hierarchy)
