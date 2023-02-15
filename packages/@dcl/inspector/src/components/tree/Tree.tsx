import React, { useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'

import './Tree.css'

import { Tree, TreeType } from '../../utils/tree'
import { Input } from './input'
import { Controls } from './controls'
import { Icon } from './icon'

interface Props {
  value: Tree
}

interface TreeProps {
  tree: Tree
  update: () => void
}

const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : 'block' })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })

const MemoTree = React.memo(TreeComponent)

function TreeComponent({ tree, update }: TreeProps) {
  const { value, childs, parent, expanded = false, type } = tree
  const [editMode, setEditMode] = useState(false)
  const [insertMode, setInsertMode] = useState<TreeType | undefined>(undefined)

  const [, drag] = useDrag(
    () => ({
      type: 'tree',
      item: tree
    }),
    [tree]
  )

  const [, drop] = useDrop(() => ({
    accept: 'tree',
    drop: (item: typeof tree, monitor) => {
      if (monitor.didDrop()) return
      tree.becomeParentOf(item)
      update()
    }
  }))

  const quitEditMode = () => setEditMode(false)
  const quitInsertMode = () => setInsertMode(undefined)

  const handleToggleExpand = (_: React.MouseEvent) => {
    tree.toggleExpand()
    update()
  }

  const handleToggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditMode(true)
  }

  const onChangeEditValue = (newValue: string) => {
    tree.rename(newValue)
    setEditMode(false)
    update()
  }

  const handleNewChild = (type: TreeType) => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (tree.canExpand()) tree.expand()
    setInsertMode(type)
  }

  const onChangeNewChild = (newValue: string) => {
    if (!insertMode) return
    tree.addChild(new Tree(newValue, insertMode))
    quitInsertMode()
    update()
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    tree.becomeOrphan()
    update()
  }

  return (
    <ul ref={(node) => drag(drop(node))}>
      <li>
        <div>
          <Icon fileName={value} expanded={expanded} type={type} />
          <span onClick={handleToggleExpand} style={getEditModeStyles(editMode)}>
            {value}{' '}
            <Controls
              handleEdit={handleToggleEdit}
              handleNewChild={handleNewChild}
              handleRemove={handleRemove}
              canCreate={tree.isDirectory()}
              canDelete={!!parent}
            />
          </span>
          {editMode && <Input value={value} onCancel={quitEditMode} onSubmit={onChangeEditValue} />}
        </div>
        {tree.isDirectory() && (
          <div style={getExpandStyles(expanded)}>
            {childs.map(($, i) => (
              <MemoTree tree={$} key={`${value}-${i}`} update={update} />
            ))}
          </div>
        )}
        {insertMode && <Input value="" onCancel={quitInsertMode} onSubmit={onChangeNewChild} />}
      </li>
    </ul>
  )
}

function BuildTree({ value }: Props) {
  const [_, setTree] = useState(0)
  const updateTree = () => setTree((tree) => tree + 1)

  return (
    <div className="tree">
      <MemoTree tree={value} update={updateTree} />
    </div>
  )
}

export default BuildTree
