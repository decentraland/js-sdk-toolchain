import React from 'react'
import cx from 'classnames'
import { TextField } from '../TextField'
import { Block } from '../../Block'

import './Vector3Field.css'

export type Vector3FieldProps = {
  label?: string
  value: { x: number; y: number; z: number }
  onChange: (value: { x: number; y: number; z: number }) => void
  disabled?: boolean
  className?: string
  showLabels?: boolean
  useLeftLabels?: boolean
}

const Vector3Field: React.FC<Vector3FieldProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  className = '',
  showLabels = true,
  useLeftLabels = false
}) => {
  const handleChange = (axis: 'x' | 'y' | 'z') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value) || 0
    onChange({
      ...value,
      [axis]: newValue
    })
  }

  return (
    <Block className={cx('Vector3', 'Field', className)} label={label}>
      <TextField
        leftLabel={useLeftLabels && showLabels ? 'X' : undefined}
        label={!useLeftLabels && showLabels ? 'X' : undefined}
        type="number"
        value={value.x.toString()}
        onChange={handleChange('x')}
        disabled={disabled}
        autoSelect
      />
      <TextField
        leftLabel={useLeftLabels && showLabels ? 'Y' : undefined}
        label={!useLeftLabels && showLabels ? 'Y' : undefined}
        type="number"
        value={value.y.toString()}
        onChange={handleChange('y')}
        disabled={disabled}
        autoSelect
      />
      <TextField
        leftLabel={useLeftLabels && showLabels ? 'Z' : undefined}
        label={!useLeftLabels && showLabels ? 'Z' : undefined}
        type="number"
        value={value.z.toString()}
        onChange={handleChange('z')}
        disabled={disabled}
        autoSelect
      />
    </Block>
  )
}

export default React.memo(Vector3Field)
