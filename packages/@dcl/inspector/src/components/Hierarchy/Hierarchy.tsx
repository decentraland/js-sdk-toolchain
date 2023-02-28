import * as React from 'react'
import { useTree } from '../../hooks/sdk/tree'
import { DataLayerInterface } from '../../lib/data-layer'
import { Tree } from '../Tree'

type Props = {
  dataLayer: DataLayerInterface
}

const Hierarchy: React.FC<Props> = (_props) => {
  const { tree, addChild, setParent, remove, rename, toggle } = useTree()
  return (
    <>
      {tree.map((node) => (
        <Tree
          key={node.id}
          value={node}
          onAddChild={addChild}
          onSetParent={setParent}
          onRemove={remove}
          onRename={rename}
          onToggle={toggle}
        />
      ))}
    </>
  )
}

export default Hierarchy
