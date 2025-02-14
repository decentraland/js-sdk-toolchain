import React, { useCallback, useState } from 'react'
import cx from 'classnames'
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io'
import { CheckboxField } from '../CheckboxField'

import './Accordion.css'

export type AccordionProps = {
  label: string
  children: React.ReactNode
  className?: string
  initialOpen?: boolean
  enabled?: boolean
  initialEnabled?: boolean
  onToggleEnabled?: (enabled: boolean) => void
  rightContent?: React.ReactNode
}

export const Accordion: React.FC<AccordionProps> = ({
  label,
  children,
  className,
  initialOpen = true,
  enabled,
  initialEnabled = true,
  onToggleEnabled,
  rightContent
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [isEnabled, setIsEnabled] = useState(initialEnabled)

  const handleToggleEnabled = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEnabled = e.target.checked
      setIsEnabled(newEnabled)
      onToggleEnabled?.(newEnabled)
    },
    [onToggleEnabled]
  )

  const Icon = isOpen ? <IoIosArrowUp className="icon" /> : <IoIosArrowDown className="icon" />

  return (
    <div className={cx('Accordion', className, { open: isOpen, disabled: !isEnabled })}>
      <div className="header" onClick={() => setIsOpen(!isOpen)}>
        <div className="left-content">
          {enabled !== undefined && (
            <CheckboxField checked={isEnabled} onChange={handleToggleEnabled} onClick={(e) => e.stopPropagation()} />
          )}
          <span className="label">{label}</span>
        </div>
        <div className="right-content">
          {rightContent}
          {Icon}
        </div>
      </div>
      {isOpen && (enabled === undefined || isEnabled) && <div className="content">{children}</div>}
    </div>
  )
}

export default React.memo(Accordion)
