import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import { VscChevronDown as DownArrow } from 'react-icons/vsc'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import { Option } from './Option'
import type { Props as OptionProp } from './Option/types'
import type { Props } from './types'
import './Dropdown.css'

const Dropdown: React.FC<Props> = (props) => {
  const { className, disabled, label, options, placeholder, value, onChange } = props
  const [showOptions, setShowOptions] = useState(false)
  const [isFocused, setFocus] = useState(false)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setShowOptions(!showOptions)
      setFocus(true)
    },
    [showOptions, setShowOptions, setFocus]
  )

  const handleCloseDropdown = useCallback(() => {
    setShowOptions(false)
    setFocus(false)
  }, [setShowOptions, setFocus])

  const ref = useOutsideClick(handleCloseDropdown)

  const handleSelectOption = useCallback(
    (e: any, option: OptionProp) => {
      setShowOptions(false)
      if (option.value) {
        onChange &&
          onChange({
            ...e,
            target: {
              ...e?.target,
              value: option.value.toString()
            }
          })
      }
    },
    [setShowOptions, onChange]
  )

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value?.toString() === value?.toString())?.label
  }, [options, value])

  return (
    <div className="DropdownContainer" ref={ref}>
      {label ? <label className="DropdownLabel">{label}</label> : null}
      <div
        className={cx('Dropdown', className, {
          focused: isFocused,
          disabled: !!disabled,
          open: !!showOptions
        })}
        onClick={handleClick}
      >
        {placeholder && value === undefined ? (
          <div className="DropdownPlaceholder">{placeholder}</div>
        ) : (
          <Option value={value} label={selectedLabel} className="DropdownSelection" />
        )}
        {showOptions ? (
          <div className="DropdownOptions">
            {options.map((option, idx) => (
              <Option key={idx} {...option} onClick={handleSelectOption} selected={value === option.value} />
            ))}
          </div>
        ) : null}
        <div className="DropdownArrow">
          <DownArrow />
        </div>
      </div>
    </div>
  )
}

export default React.memo(Dropdown)
