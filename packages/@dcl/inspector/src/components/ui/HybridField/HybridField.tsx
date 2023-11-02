import React, { useCallback, useEffect, useState } from 'react'
import cx from 'classnames'
import { IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'

import { Dropdown } from '../Dropdown'
import { TextField } from '../TextField'

import type { Props, Field } from './types'

import './HybridField.css'
import { isErrorMessage } from '../utils'

const HybridField: React.FC<Props> = ({
  options,
  placeholder,
  secondaryOptions,
  value,
  secondaryValue,
  secondaryPlaceholder,
  className,
  leftIcon,
  rightIcon,
  error,
  secondaryError,
  disabled,
  secondaryDisabled,
  onChange
}) => {
  const [fieldValue, setFieldValue] = useState<Field>({ mainValue: value ?? '', secondaryValue: secondaryValue ?? '' })

  useEffect(() => {
    if (value !== fieldValue.mainValue || secondaryValue !== fieldValue.secondaryValue) {
      let newValue = { ...fieldValue }
      if (value !== undefined) {
        newValue = { ...newValue, mainValue: value }
      }
      if (secondaryValue !== undefined) {
        newValue = { ...newValue, secondaryValue }
      }
      setFieldValue(newValue)
    }
  }, [value, secondaryValue])

  const handleChangeMainOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newValue = {
        ...fieldValue,
        mainValue: e.target.value
      }
      setFieldValue(newValue)
      onChange && onChange(newValue)
    },
    [fieldValue, setFieldValue, onChange]
  )

  const handleChangeSecondaryOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement> | React.FocusEvent<HTMLInputElement>) => {
      const newValue = {
        ...fieldValue,
        secondaryValue: e.target.value
      }
      setFieldValue(newValue)
      onChange && onChange(newValue)
    },
    [fieldValue, setFieldValue, onChange]
  )

  return (
    <div className={cx('HybridField', className)}>
      <div className="InputContainer">
        <Dropdown
          options={options}
          value={fieldValue.mainValue}
          placeholder={placeholder}
          onChange={handleChangeMainOption}
          error={!!error}
          disabled={disabled}
        />
        {secondaryOptions ? (
          <Dropdown
            placeholder={secondaryPlaceholder}
            options={secondaryOptions}
            value={fieldValue.secondaryValue}
            onChange={handleChangeSecondaryOption}
            error={!!secondaryError}
            disabled={secondaryDisabled}
          />
        ) : (
          <TextField
            placeholder={secondaryPlaceholder}
            value={fieldValue.secondaryValue}
            onBlur={handleChangeSecondaryOption}
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            error={!!secondaryError}
            disabled={secondaryDisabled}
          />
        )}
      </div>
      {isErrorMessage(error ?? secondaryError) && (
        <p className="ErrorMessage">
          <AlertIcon />
          <span>{error ?? secondaryError}</span>
        </p>
      )}
    </div>
  )
}

export default React.memo(HybridField)
