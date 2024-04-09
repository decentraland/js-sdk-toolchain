import React, { useCallback, useMemo, useRef, useState } from 'react'
import { XYCoord, useDrag, useDrop } from 'react-dnd'
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io'
import cx from 'classnames'
import { Entity } from '@dcl/ecs'

import { withContextMenu } from '../../hoc/withContextMenu'
import { Input } from '../Input'
import { ContextMenu } from './ContextMenu'
import { ActionArea } from './ActionArea'
import { Edit as EditInput } from './Edit'
import { ClickType, DropType, calculateDropType } from './utils'

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
  canDuplicate?: (value: T) => boolean
  canDrag?: (value: T) => boolean
  canReorder?: (source: T, target: T, type: DropType) => boolean
  onSetOpen: (value: T, isOpen: boolean) => void
  onSelect: (value: T, multiple?: boolean) => void
  onDoubleSelect?: (value: T) => void
  onDrop: (source: T, target: T, dropType: DropType) => void
  onRename: (value: T, label: string) => void
  onAddChild: (value: T, label: string) => void
  onRemove: (value: T) => void
  onDuplicate: (value: T) => void
  getDragContext?: () => unknown
  dndType?: string
  tree?: unknown
}

type EmptyString = ''

const getDefaultLevel = () => 1
const getLevelStyles = (level: number) => ({ paddingLeft: `${(level - 1) * 10}px` })
const getExpandStyles = (active: boolean) => ({ height: active ? 'auto' : '0', overflow: 'hidden', display: 'block' })
const getEditModeStyles = (active: boolean) => ({ display: active ? 'none' : '' })

export function Tree<T>() {
  return React.memo(
    withContextMenu<Props<T>>((props) => {
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
        onDrop,
        canRename,
        canAddChild,
        canRemove,
        canDuplicate,
        canDrag,
        canReorder,
        onRename,
        onAddChild,
        onRemove,
        onDuplicate,
        onDoubleSelect,
        onSetOpen,
        getDragContext = () => ({}),
        dndType = 'tree'
      } = props
      const ref = useRef<HTMLDivElement>(null)
      const id = getId(value)
      const label = getLabel(value)
      const open = isOpen(value)
      const selected = isSelected(value)
      const hidden = isHidden(value)
      const enableRename = canRename ? canRename(value) : true
      const enableAddChild = canAddChild ? canAddChild(value) : true
      const enableRemove = canRemove ? canRemove(value) : true
      const enableOpen = getChildren(value).length > 0
      const enableDuplicate = canDuplicate ? canDuplicate(value) : true
      const enableDrag = canDrag ? canDrag(value) : true
      const extraContextMenu = getExtraContextMenu ? getExtraContextMenu(value) : null
      const [editMode, setEditMode] = useState(false)
      const [insertMode, setInsertMode] = useState(false)
      const [dropType, setDropType] = useState<DropType | EmptyString>('')
      // we need this ref just for the e2e tests to work since it's caching "dropType" value for some reason...
      const dropTypeRef = useRef<DropType | EmptyString>('')
      const canDrop = useCallback(
        (target: T, source: T): boolean => {
          if (getId(target) === getId(source)) return false
          return getChildren(target).every(($) => canDrop($, source))
        },
        [getId, getChildren]
      )

      const [, drag] = useDrag(
        () => ({
          type: dndType,
          canDrag: enableDrag,
          item: { value, context: getDragContext() }
        }),
        [value]
      )

      const [{ isHover }, drop] = useDrop(
        () => ({
          accept: dndType,
          drop: ({ value: item }: { value: T }, monitor) => {
            const dropTypeValue = dropType || dropTypeRef.current
            if (monitor.didDrop() || !canDrop(item, value) || !dropTypeValue) return
            onDrop(item, value, dropTypeValue)
          },
          hover: ({ value: item }, monitor) => {
            if (!ref.current || item === value) {
              dropTypeRef.current = ''
              return setDropType('')
            }

            const coords = monitor.getClientOffset() as XYCoord
            const rect = ref.current.getBoundingClientRect()
            const dropType = calculateDropType(coords.y, rect)
            const enableReorder = canReorder ? canReorder(item, value, dropType) : true
            const newDropTypeValue = enableReorder ? dropType : ''

            setDropType(newDropTypeValue)
            dropTypeRef.current = newDropTypeValue
          },
          collect: (monitor) => ({
            isHover: monitor.isOver({ shallow: true })
          })
        }),
        [value, dropType, onDrop, canDrop]
      )

      const quitEditMode = () => setEditMode(false)
      const quitInsertMode = () => setInsertMode(false)

      const handleSelect = (event: React.MouseEvent) => {
        if (event.type === ClickType.CONTEXT_MENU && event.ctrlKey) {
          onSelect(value, true)
        } else if (event.type === ClickType.CLICK) {
          onSelect(value)
          if (event.detail > 1 && onDoubleSelect) onDoubleSelect(value)
        }
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

      const handleDuplicate = () => {
        onDuplicate(value)
      }

      const isEntity = useMemo(() => {
        return typeof value !== 'string'
      }, [value])

      drag(drop(ref))

      const controlsProps = {
        id: contextMenuId,
        enableAdd: enableAddChild,
        enableEdit: enableRename,
        enableRemove,
        enableDuplicate,
        onAddChild: handleNewChild,
        onEdit: handleToggleEdit,
        onRemove: handleRemove,
        onDuplicate: handleDuplicate,
        extra: extraContextMenu
      }

      const children = getChildren(value)
      const treeClassNames = cx('Tree', className, {
        'is-parent': children.length,
        [dropType]: isHover && dropType
      })

      return (
        <div className={treeClassNames} data-test-id={id} data-test-label={label}>
          <div style={getLevelStyles(level)} className={cx({ selected, item: true, hidden })}>
            <ContextMenu {...controlsProps} />
            <div ref={ref} style={getEditModeStyles(editMode)} className="item-area">
              <DisclosureWidget enabled={enableOpen} isOpen={open} onOpen={handleOpen} />
              <div onClick={handleSelect} onContextMenu={handleSelect} className="selectable-area">
                {props.getIcon ? props.getIcon(value) : <></>}
                <div>{label || id}</div>
                {isEntity && <ActionArea entity={value as Entity} />}
              </div>
            </div>
            {editMode && typeof label === 'string' && (
              <EditInput value={label || ''} onCancel={quitEditMode} onSubmit={onChangeEditValue} />
            )}
          </div>
          <TreeChildren {...props} />
          {insertMode && <Input value="" onCancel={quitInsertMode} onSubmit={handleAddChild} onBlur={quitInsertMode} />}
        </div>
      )
    })
  )
}

interface DisclosureWidgetProps {
  enabled: boolean
  isOpen: boolean
  onOpen: (e: React.MouseEvent) => void
}

// fun naming? https://en.wikipedia.org/wiki/Disclosure_widget
function DisclosureWidget({ enabled, isOpen, onOpen }: DisclosureWidgetProps) {
  if (!enabled) {
    return <span style={{ marginLeft: '12px' }}></span>
  }
  const Arrow = isOpen ? IoIosArrowDown : IoIosArrowForward
  return <Arrow onClick={onOpen} />
}

function TreeChildren<T>(props: Props<T>) {
  const CompTree = Tree<T>()
  const { value, level = getDefaultLevel(), getChildren, getId, isOpen, isHidden } = props
  const children = getChildren(value)
  const open = isOpen(value)
  const hidden = isHidden(value)
  const levelProp = hidden ? level : level + 1

  if (!children.length || !open) return null

  return (
    <div style={getExpandStyles(open)}>
      {children.map(($) => (
        <CompTree {...props} value={$} level={levelProp} key={getId($)} />
      ))}
    </div>
  )
}

export default Tree
