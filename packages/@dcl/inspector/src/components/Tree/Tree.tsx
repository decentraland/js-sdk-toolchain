import React, { useCallback, useEffect, useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'

import { Input } from '../Input'
import { Controls } from '../Controls'
import { RxDoubleArrowRight as ArrowRight, RxDoubleArrowDown as ArrowDown } from 'react-icons/rx'

import './Tree.css'
import { Position } from '../Controls/Controls'

export type Props<T> = {
  value: T
  level?: number
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

const getDefaultLevel = () => 1
const getLevelStyles = (level: number) => ({ paddingLeft: `${level * 10}px` })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })
const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : '' })

function Tree<T>(props: Props<T>) {
  const {
    value,
    level = getDefaultLevel(),
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
  const label = getLabel(value)
  const open = isOpen(value)
  const selected = isSelected(value)
  const enableRename = canRename ? canRename(value) : true
  const enableAddChild = canAddChild ? canAddChild(value) : true
  const enableRemove = canRemove ? canRemove(value) : true
  const enableToggle = canToggle ? canToggle(value) : true
  const [editMode, setEditMode] = useState(false)
  const [insertMode, setInsertMode] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState<Position | undefined>(undefined)

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPosition({ x: e.pageX, y: e.pageY })
  }

  const handleContextMenuCancel = () => setContextMenuPosition(undefined)

  const ref = (node: HTMLDivElement | null) => drag(drop(node))

  const controlsProps = {
    active: !!contextMenuPosition,
    enableAdd: enableAddChild,
    enableEdit: enableRename,
    enableRemove,
    onAdd: handleNewChild,
    onCancel: handleContextMenuCancel,
    onEdit: handleToggleEdit,
    onRemove: handleRemove,
    position: contextMenuPosition
  }

  return (
    <div ref={ref} className="Tree" onContextMenu={handleContextMenu}>
      <div style={getLevelStyles(level)} className={selected ? 'selected' : ''}>
        <span onClick={handleToggleExpand} style={getEditModeStyles(editMode)}>
          {open ? <ArrowDown /> : <ArrowRight />}
          <span>{label || id}</span>
        </span>
        {editMode && <Input value={label || ''} onCancel={quitEditMode} onSubmit={onChangeEditValue} />}
        <Controls {...controlsProps} />
      </div>
      <TreeChildren {...props} />
      {insertMode && <Input value="" onCancel={quitInsertMode} onSubmit={handleAddChild} />}
    </div>
  )
}

function TreeChildren<T>(props: Props<T>) {
  const { value, level = getDefaultLevel(), getChildren, getId, isOpen } = props
  const children = getChildren(value)
  const open = isOpen(value)

  if (!children.length || !open) return null

  return (
    <div style={getExpandStyles(open)}>
      {children.map(($) => (
        <Tree {...props} value={$} level={level + 1} key={getId($)} />
      ))}
    </div>
  )
}

export default Tree
