import React, { useCallback, useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io'
import cx from 'classnames'

import { withContextMenu } from '../../hoc/withContextMenu'
import { Input } from '../Input'
import { ContextMenu } from './ContextMenu'

import './Tree.css'

type Props<T> = {
  value: T
  className?: string
  getExtraContextMenu?: (value: T) => JSX.Element | null
  level?: number
  getId: (value: T) => string
  getChildren: (value: T) => T[]
  getIcon?: (value: T) => JSX.Element
  getLabel: (value: T) => string | JSX.Element
  isOpen: (value: T) => boolean
  isSelected: (value: T) => boolean
  isHidden: (value: T) => boolean
  canRename?: (value: T) => boolean
  canAddChild?: (value: T) => boolean
  canRemove?: (value: T) => boolean
  onSetOpen: (value: T, isOpen: boolean) => void
  onSelect: (value: T) => void
  onSetParent: (value: T, parent: T) => void
  onRename: (value: T, label: string) => void
  onAddChild: (value: T, label: string) => void
  onRemove: (value: T) => void
  getDragContext?: () => unknown
  dndType?: string
  tree?: unknown
}

const getDefaultLevel = () => 1
const getLevelStyles = (level: number) => ({ paddingLeft: `${(level - 1) * 10}px` })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })
const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : '' })

export function Tree<T>() {
  return React.memo(withContextMenu<Props<T>>((props) => {
    const {
      getExtraContextMenu,
      className,
      contextMenuId,
      value,
      level = getDefaultLevel(),
      getId,
      getChildren,
      getLabel,
      isOpen,
      isSelected,
      onSelect,
      isHidden,
      onSetParent,
      canRename,
      canAddChild,
      canRemove,
      onRename,
      onAddChild,
      onRemove,
      onSetOpen,
      getDragContext = () => ({}),
      dndType = 'tree'
    } = props
    const id = getId(value)
    const label = getLabel(value)
    const open = isOpen(value)
    const selected = isSelected(value)
    const hidden = isHidden(value)
    const enableRename = canRename ? canRename(value) : true
    const enableAddChild = canAddChild ? canAddChild(value) : true
    const enableRemove = canRemove ? canRemove(value) : true
    const enableOpen = getChildren(value).length > 0
    const extraContextMenu = getExtraContextMenu ? getExtraContextMenu(value) : null
    const [editMode, setEditMode] = useState(false)
    const [insertMode, setInsertMode] = useState(false)
    const canDrop = useCallback(
      (target: T, source: T): boolean => {
        if (getId(target) === getId(source)) return false
        return getChildren(target).every(($) => canDrop($, source))
      },
      [getId, getChildren]
    )

    const [, drag] = useDrag(() => ({ type: dndType, item: { value, context: getDragContext() } }), [value])

    const [, drop] = useDrop(
      () => ({
        accept: dndType,
        drop: ({ value: other }: { value: T }, monitor) => {
          if (monitor.didDrop() || !canDrop(other, value)) return
          onSetParent(other, value)
        }
      }),
      [value, onSetParent, canDrop]
    )

    const quitEditMode = () => setEditMode(false)
    const quitInsertMode = () => setInsertMode(false)

    const handleSelect = (_: React.MouseEvent) => {
      onSelect(value)
    }

    const handleOpen = (_: React.MouseEvent) => {
      onSetOpen(value, !open)
    }

    const handleToggleEdit = () => {
      setEditMode(true)
    }

    const onChangeEditValue = (newValue: string) => {
      onRename(value, newValue)
      setEditMode(false)
    }

    const handleNewChild = () => {
      setInsertMode(true)
    }

    const handleAddChild = (childLabel: string) => {
      if (!insertMode) return
      onAddChild(value, childLabel)
      quitInsertMode()
      onSetOpen(value, true)
    }

    const handleRemove = () => {
      onRemove(value)
    }

    const ref = (node: HTMLDivElement | null) => drag(drop(node))

    const controlsProps = {
      id: contextMenuId,
      enableAdd: enableAddChild,
      enableEdit: enableRename,
      enableRemove,
      onAddChild: handleNewChild,
      onEdit: handleToggleEdit,
      onRemove: handleRemove,
      extra: extraContextMenu
    }

    const nodeClassnames = cx({ selected, item: true, hidden })

    return (
      <div ref={ref} className={`Tree ${className || ''}`}>
        <div style={getLevelStyles(level)} className={nodeClassnames}>
          <ContextMenu {...controlsProps} />
          <div style={getEditModeStyles(editMode)} className='item-area'>
            { enableOpen ? open ? <IoIosArrowDown onClick={handleOpen} /> : <IoIosArrowForward onClick={handleOpen} /> : <span style={{marginLeft: '12px'}}></span> }
            <div onClick={handleSelect} className='selectable-area'>
              { props.getIcon ? props.getIcon(value) : <></> }
              <div>{label || id}</div>
            </div>
          </div>
          {editMode && typeof label === 'string' && (
            <Input value={label || ''} onCancel={quitEditMode} onSubmit={onChangeEditValue} />
          )}
        </div>
        <TreeChildren {...props} />
        {insertMode && <Input value="" onCancel={quitInsertMode} onSubmit={handleAddChild} onBlur={quitInsertMode}/>}
      </div>
    )
  }))
}

function TreeChildren<T>(props: Props<T>) {
  const CompTree = Tree<T>()
  const { value, level = getDefaultLevel(), getChildren, getId, isOpen, isHidden } = props
  const children = getChildren(value)
  const open = isOpen(value)
  const hidden = isHidden(value)

  if (!children.length || !open) return null

  return (
    <div style={getExpandStyles(open)}>
      {children.map(($) => (
        <CompTree {...props} value={$} level={hidden ? level : level + 1} key={getId($)} />
      ))}
    </div>
  )
}

export default Tree
