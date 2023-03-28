import React, { useCallback, useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { MdOutlineDriveFileRenameOutline } from 'react-icons/md'
import { AiFillDelete, AiFillFileAdd } from 'react-icons/ai'

import { Input } from '../Input'

import './Tree.css'

export type Props<T> = {
  value: T
  getId: (value: T) => string
  getChildren: (value: T) => T[]
  getLabel: (value: T) => string
  isOpen: (value: T) => boolean
  isSelected: (value: T) => boolean
  canRename?: (value: T) => boolean
  canAddChild?: (value: T) => boolean
  canRemove?: (value: T) => boolean
  canToggle?: (value: T) => boolean
  onSetParent: (value: T, parent: T) => void
  onRename: (value: T, label: string) => void
  onAddChild: (value: T, label: string) => void
  onRemove: (value: T) => void
  onToggle: (value: T, isOpen: boolean) => void
}

const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : 'block' })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })

function Tree<T>(props: Props<T>) {
  const {
    value,
    getId,
    getChildren,
    getLabel,
    isOpen,
    isSelected,
    onSetParent,
    canRename,
    canAddChild,
    canRemove,
    canToggle,
    onRename,
    onAddChild,
    onRemove,
    onToggle
  } = props
  const id = getId(value)
  const children = getChildren(value)
  const label = getLabel(value)
  const open = isOpen(value)
  const selected = isSelected(value)
  const enableRename = canRename ? canRename(value) : true
  const enableAddChild = canAddChild ? canAddChild(value) : true
  const enableRemove = canRemove ? canRemove(value) : true
  const enableToggle = canToggle ? canToggle(value) : true
  const [editMode, setEditMode] = useState(false)
  const [insertMode, setInsertMode] = useState(false)

  const canDrop = useCallback(
    (target: T, source: T): boolean => {
      if (getId(target) === getId(source)) return false
      return getChildren(target).every(($) => canDrop($, source))
    },
    [getId, getChildren]
  )

  const [, drag] = useDrag(() => ({ type: 'tree', item: { value } }), [value])

  const [, drop] = useDrop(
    () => ({
      accept: 'tree',
      drop: ({ value: other }: { value: T }, monitor) => {
        if (monitor.didDrop() || !canDrop(other, value)) return
        onSetParent(other, value)
      }
    }),
    [value, onSetParent, canDrop]
  )

  const quitEditMode = () => setEditMode(false)
  const quitInsertMode = () => setInsertMode(false)

  const handleToggleExpand = (_: React.MouseEvent) => {
    if (enableToggle) {
      onToggle(value, !selected || !open)
    }
  }

  const handleToggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditMode(true)
  }

  const onChangeEditValue = (newValue: string) => {
    onRename(value, newValue)
    setEditMode(false)
  }

  const handleNewChild = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInsertMode(true)
  }

  const handleAddChild = (childLabel: string) => {
    if (!insertMode) return
    onAddChild(value, childLabel)
    quitInsertMode()
    onToggle(value, true)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(value)
  }

  return (
    <ul ref={(node) => drag(drop(node))}>
      <li>
        <div>
          <span onClick={handleToggleExpand} style={getEditModeStyles(editMode)}>
            {selected ? '[ST]' : ''}
            {label || id}{' '}
            {enableRename && (
              <button onClick={handleToggleEdit}>
                <MdOutlineDriveFileRenameOutline />
              </button>
            )}
            {enableAddChild && (
              <button onClick={handleNewChild}>
                <AiFillFileAdd />
              </button>
            )}
            {enableRemove && (
              <button onClick={handleRemove}>
                <AiFillDelete />
              </button>
            )}
          </span>
          {editMode && <Input value={label || ''} onCancel={quitEditMode} onSubmit={onChangeEditValue} />}
        </div>
        {!!children.length && open && (
          <div style={getExpandStyles(open)}>
            {children.map(($) => (
              <Tree {...props} value={$} key={getId($)} />
            ))}
          </div>
        )}
        {insertMode && <Input value="" onCancel={quitInsertMode} onSubmit={handleAddChild} />}
      </li>
    </ul>
  )
}

export default Tree
