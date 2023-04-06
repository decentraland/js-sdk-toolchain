import React, { useCallback, useEffect } from 'react'
import { MdOutlineDriveFileRenameOutline } from 'react-icons/md'
import { AiFillFileAdd, AiFillDelete, AiOutlineArrowRight } from 'react-icons/ai'

import './Controls.css'

export interface Position {
  x: number
  y: number
}

export interface ControlsProps {
  active?: boolean
  components?: Map<number, string>
  position?: Position
  enableAdd?: boolean
  enableEdit?: boolean
  enableRemove?: boolean
  onAddComponent: (e: React.MouseEvent, componentId: number) => void
  onAddChild: (e: React.MouseEvent) => void
  onCancel: () => void
  onEdit: (e: React.MouseEvent) => void
  onRemove: (e: React.MouseEvent) => void
}

// TODO: enumerate better the components names
const ENABLED_COMPONENTS = new Set([
  'core::Transform',
  'core::Billboard',
  'core::TextShape',
  'core::MeshRenderer'
])

const cancelingKeys = new Set(['Escape', 'Tab'])
const getComponentName = (value: string) => (value.match(/[^:]*$/) || [])[0]
const isComponentEnabled = (value: string) => ENABLED_COMPONENTS.has(value)

const Controls = ({
  active = false,
  components = new Map(),
  position = { x: 0, y: 0 },
  enableAdd = true,
  enableEdit = true,
  enableRemove = true,
  onAddComponent,
  onAddChild,
  onCancel,
  onEdit,
  onRemove
}: ControlsProps) => {
  const handleCancel = useCallback((e: Event | React.MouseEvent) => {
    e.stopPropagation()
    onCancel()
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (cancelingKeys.has(e.key)) handleCancel(e)
  }, [])

  useEffect(() => {
    if (active) {
      document.body.addEventListener('click', handleCancel)
      document.body.addEventListener('keyup', handleKeyUp)
    }

    return () => {
      document.body.removeEventListener('click', handleCancel)
      document.body.removeEventListener('keyup', handleKeyUp)
    }
  }, [active])

  const handleAction = useCallback(
    (cb: (e: React.MouseEvent, ...params: any) => void, ...params: any) => (e: React.MouseEvent) => {
      cb(e, ...params)
      handleCancel(e)
    },
    []
  )

  const someActionIsEnabled = enableAdd || enableEdit || enableRemove
  const shouldRender = someActionIsEnabled && active

  if (!shouldRender) return null

  return (
    <div className="Controls" style={{ top: position.y, left: position.x }}>
      {enableEdit && (
        <div className="button" onClick={handleAction(onEdit)}>
          <MdOutlineDriveFileRenameOutline /> Rename
        </div>
      )}
      {enableAdd && (
        <div className="button" onClick={handleAction(onAddChild)}>
          <AiFillFileAdd /> Add child
        </div>
      )}
      {enableRemove && (
        <div className="button" onClick={handleAction(onRemove)}>
          <AiFillDelete /> Delete
        </div>
      )}
      {enableEdit && (
        <div className="submenu">
          Add component <AiOutlineArrowRight />
          <div className="Controls">
            {Array.from(components.entries()).map(([id, name]) => {
              if (!isComponentEnabled(name)) return null
              return (
                <div key={id} className="button" onClick={handleAction(onAddComponent, id)}>
                  {getComponentName(name)}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(Controls)
