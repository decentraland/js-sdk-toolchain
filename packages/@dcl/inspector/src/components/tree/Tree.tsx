import React, { useState } from 'react'
import './Tree.css'

import { Tree, TreeType } from '../../tree'
import { Input } from './input'
import { Controls } from './controls'
import initActive from '../../utils/set-value'

interface Props {
  value: Tree
}

interface TreeProps {
  tree: Tree
  update: () => void
}

const active = initActive<Tree>()
const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : 'block' })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })

const MemoTree = React.memo(TreeComponent)

function TreeComponent({ tree, update }: TreeProps) {
  const { value, childs, parent, expanded = false, type } = tree
  const [editMode, setEditMode] = useState(false)
  const [insertMode, setInsertMode] = useState<TreeType | undefined>(undefined)

  const quitEditMode = () => setEditMode(false)
  const quitInsertMode = () => setInsertMode(undefined)

  const onDrop = (e: React.MouseEvent) => {
    e.stopPropagation()
    const droppedChild = active.get()

    if (!droppedChild) return

    tree.becomeParentOf(droppedChild)
    active.unset()
    update()
  }

  const onDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    if (!parent) return
    active.set(tree)
  }

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
    <ul
      draggable
      onDragOver={(e: React.DragEvent) => e.preventDefault()}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <li>
        <span onClick={handleToggleExpand} style={getEditModeStyles(editMode)}>
          {value} <Controls
            handleEdit={handleToggleEdit}
            handleNewChild={handleNewChild}
            handleRemove={handleRemove}
            canCreate={tree.isDirectory()}
            canDelete={!!parent}
          />
        </span>
        {editMode && <Input value={value} onCancel={quitEditMode} onSubmit={onChangeEditValue}/>}
        <span style={getExpandStyles(expanded)}>
          {childs.map(($, i) => <MemoTree tree={$} key={`${value}-${i}`} update={update} />)}
        </span>
        {insertMode && <Input value='' onCancel={quitInsertMode} onSubmit={onChangeNewChild}/>}
      </li>
    </ul>
  )
}

function BuildTree({ value }: Props) {
  const [tree, setTree] = useState(0)
  const updateTree = () => setTree(tree + 1)

  return (
    <div className="tree">
      <TreeComponent tree={value} update={updateTree} />
    </div>
  )
}

export default BuildTree
