import * as React from 'react'
import { useTree } from '../../hooks/sdk/useTree'
import { ROOT } from '../../lib/sdk/tree'
import { Tree } from '../Tree'

const Hierarchy: React.FC = () => {
  const { tree, addChild, setParent, remove, rename, toggle, getId, getChildren, getLabel, isOpen, isSelected } =
    useTree()
  return (
    <>
      {Array.from(tree.get(ROOT)!).map((entity) => (
        <Tree
          key={getId(entity)}
          value={entity}
          onAddChild={addChild}
          onSetParent={setParent}
          onRemove={remove}
          onRename={rename}
          onToggle={toggle}
          getId={getId}
          getChildren={getChildren}
          getLabel={getLabel}
          isOpen={isOpen}
          isSelected={isSelected}
        />
      ))}
    </>
  )
}

export default Hierarchy
