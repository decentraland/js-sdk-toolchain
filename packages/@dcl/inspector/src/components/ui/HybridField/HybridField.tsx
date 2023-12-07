import React, { useCallback, useEffect, useState } from 'react'
import cx from 'classnames'

import { Dropdown } from '../Dropdown'
import { TextField } from '../TextField'
import { Message, MessageType } from '../Message'
import { ColorPicker } from '../ColorPicker'
import { Label } from '../Label'
import type { Props as TextFieldProps } from '../TextField/types'
import { type Props, type Field, FieldType } from './types'

import './HybridField.css'

function isSecondaryValueTextFieldProp(value?: Field['secondaryValue']): value is TextFieldProps {
  if (value && typeof value === 'object' && 'value' in value) {
    return true
  }

  return false
}

const HybridField: React.FC<Props> = ({
  options,
  placeholder,
  secondaryOptions = [],
  value,
  secondaryValue,
  secondaryPlaceholder,
  className,
  leftIcon,
  rightIcon,
  label,
  error,
  secondaryError,
  disabled,
  secondaryDisabled,
  secondaryType = FieldType.DROPDOWN,
  onChange,
  onChangeSecondary
}) => {
  const [fieldMainValue, setMainValue] = useState<Field['mainValue']>(value ?? '')
  const [fieldSecondaryValue, setSecondaryValue] = useState<Field['secondaryValue']>(secondaryValue ?? '')

  useEffect(() => {
    if (value !== fieldMainValue) {
      setMainValue(value)
    }

    if (secondaryValue !== fieldSecondaryValue) {
      setSecondaryValue(secondaryValue)
    }
  }, [value, secondaryValue])

  const handleChangeMainOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setMainValue(e.target.value)
      onChange && onChange(e)
    },
    [setMainValue, onChange]
  )

  const handleChangeSecondaryOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
      setSecondaryValue(e.target.value)
      onChangeSecondary && onChangeSecondary(e)
    },
    [setSecondaryValue, onChangeSecondary]
  )

  return (
    <div className={cx('Hybrid Field', className)}>
      <Label text={label} />
      <div className="InputContainer">
        <Dropdown
          options={options}
          value={fieldMainValue}
          placeholder={placeholder}
          onChange={handleChangeMainOption}
          error={!!error}
          disabled={disabled}
        />
        {secondaryType === FieldType.DROPDOWN ? (
          <Dropdown
            placeholder={secondaryPlaceholder}
            options={secondaryOptions}
            value={fieldSecondaryValue as React.OptionHTMLAttributes<HTMLElement>['value']}
            onChange={handleChangeSecondaryOption}
            error={!!secondaryError}
            disabled={secondaryDisabled}
          />
        ) : secondaryType === FieldType.COLOR_PICKER ? (
          <ColorPicker
            value={fieldSecondaryValue as HTMLInputElement['value']}
            onChange={handleChangeSecondaryOption}
            error={!!secondaryError}
            disabled={secondaryDisabled}
          />
        ) : (
          <TextField
            placeholder={secondaryPlaceholder}
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            {...(isSecondaryValueTextFieldProp(fieldSecondaryValue)
              ? fieldSecondaryValue
              : { value: fieldSecondaryValue })}
            onBlur={handleChangeSecondaryOption}
            error={!!secondaryError}
            disabled={secondaryDisabled}
          />
        )}
      </div>
      <Message text={error ?? secondaryError} type={MessageType.ERROR} />
    </div>
  )
}

export default React.memo(HybridField)
