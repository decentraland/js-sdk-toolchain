import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import { VscChevronDown as DownArrowIcon, VscSearch as SearchIcon } from 'react-icons/vsc'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import { TextField } from '../TextField'
import { ErrorMessage } from '../ErrorMessage'
import { Option } from './Option'
import type { Props as OptionProp } from './Option/types'
import type { Props } from './types'
import './Dropdown.css'

const FONT_SIZE = 13
const FONT_WEIGHT = 700
const WIDTH_CONST = 1200
const ICON_SIZE = 16

function isOptionSelected(currentValue?: any, optionValue?: any) {
  return currentValue?.toString() === optionValue?.toString()
}

const Dropdown: React.FC<Props> = (props) => {
  const { className, disabled, empty, error, label, options, searchable, value, onChange, placeholder = '' } = props
  const [showOptions, setShowOptions] = useState(false)
  const [isFocused, setFocus] = useState(false)
  const [search, setSearch] = useState('')

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setFocus(true)
      if (showOptions) {
        // Clear search text when closing the dropdown
        setSearch('')
        setShowOptions(false)
      } else {
        setShowOptions(true)
      }
    },
    [showOptions, setShowOptions, setFocus, setSearch]
  )

  const handleCloseDropdown = useCallback(() => {
    setShowOptions(false)
    setFocus(false)
    setSearch('')
  }, [setShowOptions, setFocus, setSearch])

  const ref = useOutsideClick(handleCloseDropdown)

  const handleSelectOption = useCallback(
    (e: any, option: OptionProp) => {
      setShowOptions(false)
      if (option.value !== undefined) {
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

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value)
    },
    [setSearch]
  )

  const handleSearchClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Avoid close the dropdown when clicking on the search input
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const filterOptions = useCallback(
    (option: OptionProp) => {
      if (searchable && search) {
        const value = option.label?.toLowerCase() ?? option.value?.toString().toLowerCase() ?? ''
        return value.includes(search.toLowerCase())
      }

      return true
    },
    [searchable, search]
  )

  const filteredOptiones = useMemo(() => {
    return options.filter(filterOptions)
  }, [options, filterOptions])

  const renderEmptyMessage = useCallback(() => {
    if (options.length > 0 && filteredOptiones.length === 0) {
      return 'There are no results for this search.'
    }

    if (options.length === 0) {
      return empty || 'No options available.'
    }
  }, [empty, options, filteredOptiones])

  const selectedValue = useMemo(() => {
    return options.find((option) => isOptionSelected(value, option.value))
  }, [options, value])

  const minWidth = useMemo(() => {
    if (options.length > 0) {
      return options.reduce((minWidth, option) => {
        const label = option.label ?? option.value?.toString() ?? ''
        const leftIconWidth = option.leftIcon ? ICON_SIZE + 4 : 0
        const rightIconWidth = option.rightIcon ? ICON_SIZE + 4 : 0
        return Math.max(
          minWidth,
          (label.length * FONT_SIZE * FONT_WEIGHT + leftIconWidth + rightIconWidth) / WIDTH_CONST
        )
      }, 0)
    }
  }, [options, empty])

  return (
    <div className="Dropdown Field" ref={ref}>
      {label ? <label className="DropdownLabel">{label}</label> : null}
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
          <Option {...selectedValue} className="DropdownSelection" minWidth={minWidth} />
        ) : (
          <Option className="DropdownPlaceholder" value={placeholder} minWidth={minWidth} />
        )}
        {showOptions ? (
          <div className={cx('DropdownOptions', { searchable })}>
            {searchable && options.length > 0 ? (
              <TextField
                className="DropdownSearch"
                placeholder="Search"
                rightIcon={<SearchIcon />}
                onChange={handleSearchChange}
                onClick={handleSearchClick}
              />
            ) : null}
            {filteredOptiones.length > 0 ? (
              filteredOptiones.map((option, idx) => (
                <Option
                  key={idx}
                  {...option}
                  onClick={handleSelectOption}
                  selected={isOptionSelected(value, option.value)}
                  minWidth={minWidth}
                />
              ))
            ) : (
              <Option className="DropdownEmptyOption" label={renderEmptyMessage()} disabled />
            )}
          </div>
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
