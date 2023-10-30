import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import { VscChevronDown as DownArrow } from 'react-icons/vsc'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import { Option } from './Option'
import type { Props as OptionProp } from './Option/types'
import type { Props } from './types'
import './Dropdown.css'

const FONT_WIDTH = 6.6

function isOptionSelected(currentValue?: any, optionValue?: any) {
  return currentValue?.toString() === optionValue?.toString()
}

const Dropdown: React.FC<Props> = (props) => {
  const { className, disabled, empty, label, options, value, onChange, placeholder = '' } = props
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

  const selectedValue = useMemo(() => {
    return options.find((option) => isOptionSelected(value, option.value))
  }, [options, value])

  const minWidth = useMemo(() => {
    if (options.length > 0) {
      return options.reduce((minWidth, option) => {
        return Math.max(minWidth, (option.label?.length ?? option.value?.toString().length ?? 0) * FONT_WIDTH)
      }, 0)
    }

    return (empty?.length ?? 0) * FONT_WIDTH
  }, [options, empty])

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
        {selectedValue ? (
          <Option {...selectedValue} className="DropdownSelection" minWidth={minWidth} />
        ) : (
          <div className="DropdownPlaceholder" style={{ minWidth: minWidth }}>
            {placeholder}
          </div>
        )}
        {showOptions ? (
          <div className="DropdownOptions">
            {options.length > 0 ? (
              options.map((option, idx) => (
                <Option
                  key={idx}
                  {...option}
                  onClick={handleSelectOption}
                  selected={isOptionSelected(value, option.value)}
                  minWidth={minWidth}
                />
              ))
            ) : (
              <Option label={empty} minWidth={minWidth} />
            )}
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
