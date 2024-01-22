import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import { VscSearch as SearchIcon } from 'react-icons/vsc'
import { TextField } from '../../TextField'
import { InfoTooltip } from '../../InfoTooltip'
import { Props as TooltipProps } from '../../InfoTooltip/types'
import { Option } from '../Option'
import { Props as OptionProp } from '../Option/types'
import { isMultipleOptionSelected, isOptionSelected } from '../utils'
import { Props } from './types'
import './OptionList.css'

const isTooltipText = (tooltip: string | TooltipProps | undefined | null): tooltip is string => {
  return tooltip !== undefined && tooltip !== null && (typeof tooltip === 'string' || tooltip instanceof String)
}

const OptionList: React.FC<Props> = (props) => {
  const { empty, minWidth, multiple, options, searchable, selectedValue, isField, onChange } = props
  const [search, setSearch] = useState('')

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

  const filteredOptions = useMemo(() => {
    return options.filter(filterOptions)
  }, [options, filterOptions])

  const isSelected = useCallback(
    (option: OptionProp) => {
      return multiple
        ? isMultipleOptionSelected(
            (selectedValue as OptionProp[]).map(($) => $.value),
            option.value
          )
        : isOptionSelected((selectedValue as OptionProp)?.value, option.value)
    },
    [selectedValue, multiple]
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

  const handleSelectOption = useCallback(
    (e: any, option: OptionProp) => {
      if (option.value !== undefined) {
        const formatSelectedValue =
          multiple && (selectedValue as OptionProp[]).length > 0
            ? (selectedValue as OptionProp[]).map(({ value }) => (value ?? '').toString())
            : []
        const optionValue = multiple ? [...formatSelectedValue, option.value] : option.value.toString()
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
    [selectedValue, multiple, onChange]
  )

  const renderEmptyMessage = useCallback(() => {
    if (options.length > 0 && filteredOptions.length === 0) {
      return 'There are no results for this search.'
    }

    if (options.length === 0) {
      return empty || 'No options available.'
    }
  }, [empty, options, filteredOptions])

  const renderOption = useCallback(
    (key: React.Key, optionProps: OptionProp) => {
      return (
        <Option
          key={key}
          {...optionProps}
          onClick={optionProps.onClick ?? handleSelectOption}
          selected={isSelected(optionProps)}
          isField={isField}
          minWidth={minWidth}
        />
      )
    },
    [minWidth, isField, isSelected, handleSelectOption]
  )

  return (
    <div className={cx('OptionList', { searchable })}>
      {searchable && options.length > 0 ? (
        <TextField
          className="OptionListSearch"
          placeholder="Search"
          rightIcon={<SearchIcon />}
          onChange={handleSearchChange}
          onClick={handleSearchClick}
        />
      ) : null}
      {filteredOptions.length > 0 ? (
        filteredOptions.map((option, idx) =>
          option.tooltip ? (
            <InfoTooltip
              key={idx}
              trigger={renderOption(idx, option)}
              position="left center"
              {...(isTooltipText(option.tooltip) ? { text: option.tooltip } : option.tooltip)}
            />
          ) : (
            renderOption(idx, option)
          )
        )
      ) : (
        <Option className="OptionListEmpty" label={renderEmptyMessage()} disabled />
      )}
    </div>
  )
}

export default React.memo(OptionList)
