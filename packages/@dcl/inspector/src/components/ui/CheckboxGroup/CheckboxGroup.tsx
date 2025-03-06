import React from 'react'
import { Label } from '../Label'
import './CheckboxGroup.css'

export type CheckboxGroupProps = {
  label?: string
  children: React.ReactNode
  direction?: 'horizontal' | 'vertical'
  className?: string
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ label, children, direction = 'vertical', className = '' }) => {
  return (
    <div className={`CheckboxGroup Field ${direction} ${className}`}>
      {label && <Label text={label} />}
      <div className="CheckboxContainer">{children}</div>
    </div>
  )
}

export default React.memo(CheckboxGroup)
