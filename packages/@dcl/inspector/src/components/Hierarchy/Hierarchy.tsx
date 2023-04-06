import React from 'react'

import { useTree } from '../../hooks/sdk/useTree'
import { ROOT } from '../../lib/sdk/tree'
import { Tree } from '../Tree'

const Hierarchy: React.FC = () => {
  const {
    addComponent,
    addChild,
    setParent,
    remove,
    rename,
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
  } = useTree()

  return (
    <div className="Hierarchy">
      <Tree
        value={ROOT}
        onAddComponent={addComponent}
        onAddChild={addChild}
        onSetParent={setParent}
        onRemove={remove}
        onRename={rename}
        onToggle={toggle}
        getId={getId}
        getChildren={getChildren}
        getEntityComponents={getEntityComponents}
        getLabel={getLabel}
        isOpen={isOpen}
        isSelected={isSelected}
        canRename={canRename}
        canRemove={canRemove}
        canToggle={canToggle}
      />
    </div>
  )
}

export default React.memo(Hierarchy)
