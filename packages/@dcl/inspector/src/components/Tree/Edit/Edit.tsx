import { useCallback, useState } from 'react'

import { Modal } from '../../Modal'
import { Button } from '../../Button'
import { Input } from '../../Input'
import { Props } from './types'

import './Edit.css'

export function Edit({ value, onCancel, onSubmit }: Props) {
  const [tmpValue, setTmpValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleModalClose = useCallback(() => {
    setIsOpen(false)
    onCancel()
  }, [])

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    onSubmit(tmpValue)
  }, [tmpValue])

  const handleChange = useCallback((value: string) => {
    setTmpValue(value)
  }, [])

  const handleBlur = useCallback(() => {
    setIsOpen(true)
  }, [])

  return (
    <>
      <Modal isOpen={isOpen} onRequestClose={handleModalClose} className="EditTree">
        <h2>⚠️ Rename</h2>
        <span>
          Do you want to rename "{value}" to "{tmpValue}"
        </span>
        <div>
          <Button type="danger" size="big" onClick={handleConfirm}>
            Yes
          </Button>
          <Button size="big" onClick={handleModalClose}>
            Cancel
          </Button>
        </div>
      </Modal>
      <Input value={value} onCancel={onCancel} onSubmit={onSubmit} onChange={handleChange} onBlur={handleBlur} />
    </>
  )
}
