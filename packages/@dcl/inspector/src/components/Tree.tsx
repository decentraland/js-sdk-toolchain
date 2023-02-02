import React, { useState } from 'react'
import './Tree.css'

import initActive from '../utils/set-value'

interface Props {
  value: Tree
}

export interface Tree {
  value: string
  childs: Tree[]
  type: 'directory' | 'file'
}

interface Parent extends Tree {
  removeChild: (child: Tree) => void
  addChild: (child: Tree) => void
}

interface TreeProps extends Tree {
  open: boolean
  parent?: Parent
}

const active = initActive<TreeProps>()

const isLeaf = (tree: Tree): boolean => tree.type === 'file'
const canAdopt = (tree: Tree) => !isLeaf(tree)
const sameTree = (tree: Tree, tree2: Tree) => tree.value === tree2.value
const validDroppedChild = (child: TreeProps | null, tree: Tree): child is TreeProps & { parent: Parent } => !!(
  child && child.parent && !sameTree(child, tree)
)

function TreeComponent(props: TreeProps) {
  const [childs, updateChilds] = useState(props.childs)
  const { value, parent, open = false, type } = props
  const [isOpen, setIsOpen] = useState(open);

  const removeChild = (child: Tree) => {
    updateChilds(childs.filter(($) => $.value !== child.value))
  }

  const addChild = (child: Tree) => {
    updateChilds(childs.concat(child))
  }

  const onDrop = (e: React.MouseEvent) => {
    e.stopPropagation()
    const droppedChild = active.get()

    if (!validDroppedChild(droppedChild, props)) return

    const droppedChildParent = droppedChild.parent

    const alreadyInTree = droppedChildParent.value === value || droppedChildParent.value === parent?.value
    if (alreadyInTree) return

    droppedChild.parent.removeChild(droppedChild)

    if (canAdopt(props)) addChild(droppedChild)
    else props.parent?.addChild(droppedChild)

    active.unset()
  }

  const onDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    if (!parent) return
    active.set(props)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  };

  return (
    <ul
      draggable
      onClick={handleToggle}
      onDragOver={(e: React.DragEvent) => e.preventDefault()}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <li>
        {value}
        <span style={{ height: isOpen ? 'auto' : '0', overflow: 'hidden', display: 'block' }}>
          {childs.map(($, i) => {
            const parentTree = { value, childs, type }
            return <TreeComponent
              {...$}
              open={false}
              key={`${value}-${i}`}
              parent={{ ...parentTree, addChild, removeChild }}
            />
          })}
        </span>
      </li>
    </ul>
  )
}

function BuildTree({ value }: Props) {
  return (
    <div className="tree">
      <TreeComponent {...value} open />
    </div>
  )
}

export default BuildTree
