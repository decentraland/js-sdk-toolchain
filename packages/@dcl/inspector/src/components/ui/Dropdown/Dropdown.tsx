import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import { VscChevronDown as DownArrowIcon } from 'react-icons/vsc'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import { useContainerSize } from '../../../hooks/useContainerSize'
import { Label } from '../Label'
import { ErrorMessage } from '../ErrorMessage'
import { Option } from './Option'
import { OptionList } from './OptionList'
import { SelectedOption } from './SelectedOption'
import type { Props as OptionProp } from './Option/types'
import { FONT_SIZE, FONT_WEIGHT, WIDTH_CONST, ICON_SIZE, isMultipleOptionSelected, isOptionSelected } from './utils'
import type { Props } from './types'
import './Dropdown.css'

const Dropdown: React.FC<Props> = (props) => {
  const {
    className,
    disabled,
    empty,
    error,
    label,
    options,
    searchable,
    value,
    multiple,
    onChange,
    placeholder = ''
  } = props
  const [showOptions, setShowOptions] = useState(false)
  const [isFocused, setFocus] = useState(false)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setFocus(true)
      if (showOptions) {
        // Clear search text when closing the dropdown
        setShowOptions(false)
      } else {
        setShowOptions(true)
      }
    },
    [showOptions, setShowOptions, setFocus]
  )

  const handleCloseDropdown = useCallback(() => {
    setShowOptions(false)
    setFocus(false)
  }, [setShowOptions, setFocus])

  const ref = useOutsideClick(handleCloseDropdown)
  const containerSize = useContainerSize(ref)

  const handleRemoveOption = useCallback(
    (e: any, option: Partial<OptionProp>) => {
      if (option !== undefined) {
        const optionValue = (value as any[]).filter((v) => v !== option.value)
        onChange &&
          onChange({
            ...e,
            target: {
              ...e?.target,
              value: optionValue
            }
          })
      }
    },
    [multiple, value, onChange]
  )

  const selectedValue = useMemo(() => {
    if (multiple) {
      return options.filter((option) => isMultipleOptionSelected(value as any[], option.value))
    } else {
      return options.find((option) => isOptionSelected(value, option.value))
    }
  }, [options, value, multiple])

  const minWidth = useMemo(() => {
    if (options.length > 0) {
      const iconWidth = ICON_SIZE + 4
      const selectedIconWidth = iconWidth
      let leftIconWidth = 0
      let rightIconWidth = 0
      const _minWidth = options.reduce((width, option) => {
        const label = option.label ?? option.value?.toString() ?? ''
        const labelWidth = label.length * FONT_SIZE * FONT_WEIGHT
        leftIconWidth = Math.max(leftIconWidth, option.leftIcon ? iconWidth : 0)
        rightIconWidth = Math.max(rightIconWidth, option.rightIcon ? iconWidth : 0)
        return Math.max(width, (labelWidth + selectedIconWidth + leftIconWidth + rightIconWidth) / WIDTH_CONST)
      }, 0)

      // To calculate the option's max width, we need to substract the drop icon width, the horizontal padding and the left and right icon width
      const horizontalPadding = 16
      const maxWidth = containerSize.width
        ? containerSize.width - (iconWidth + leftIconWidth + rightIconWidth + horizontalPadding)
        : Number.MAX_SAFE_INTEGER

      return Math.min(_minWidth, maxWidth)
    }
  }, [options, empty, containerSize])

  return (
    <div className="Dropdown Field" ref={ref}>
      <Label text={label} />
      <div
        className={cx('DropdownContainer', className, {
          focused: isFocused,
          disabled: !!disabled,
          open: !!showOptions,
          error: !!error
        })}
        onClick={handleClick}
      >
        {selectedValue ? (
          <SelectedOption
            selectedValue={selectedValue}
            minWidth={minWidth}
            multiple={multiple}
            onRemove={handleRemoveOption}
          />
        ) : (
          <Option className="DropdownPlaceholder" value={placeholder} minWidth={minWidth} />
        )}
        {showOptions ? (
          <OptionList
            options={options}
            searchable={searchable}
            selectedValue={selectedValue}
            multiple={multiple}
            onChange={onChange}
          />
        ) : null}
        <div className="DropIcon">
          <DownArrowIcon size={ICON_SIZE} />
        </div>
      </div>
      <ErrorMessage error={error} />
    </div>
  )
}

export default React.memo(Dropdown)
