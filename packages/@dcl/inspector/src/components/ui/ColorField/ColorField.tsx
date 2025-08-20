import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { HybridField, Types as HybridFieldTypes } from '../HybridField'
import { Dropdown } from '../Dropdown'
import { OPTIONS, COLORS, Options } from './utils'
import { Props, ColorOptions } from './types'

import './ColorField.css'

const getColorOptions = (): ColorOptions[] => {
  return COLORS.map((color) => ({
    ...color,
    leftContent: <div className="ColorPreview" style={{ backgroundColor: color.value }} />,
    secondaryText: color.value
  }))
}

const ColorField: React.FC<Props> = ({ label, value, onChange, basic = false }) => {
  const isValidColor = useMemo(() => {
    if (!!value) {
      return COLORS.some((color) => color.value === value)
    }

    return true
  }, [value])

  const basicOptions = useMemo(() => {
    const options = getColorOptions()

    if (!isValidColor) {
      options.unshift({
        label: '-- Mixed Values --',
        selected: true,
        disabled: true,
        value: value ?? ''
      })
    }

    return options
  }, [isValidColor])

  if (basic) {
    return (
      <div className="Color Field">
        <Dropdown label={label} options={basicOptions} value={value} onChange={onChange} />
      </div>
    )
  }

  // Existing HybridField logic for full-featured mode
  const stockColor = COLORS.find(($) => $.value === value)?.value
  const isStockColor = !!stockColor
  const initialOption = isStockColor ? Options.BASICS : Options.CUSTOM
  const [selectedOption, setSelectedOption] = useState(initialOption)

  useEffect(() => {
    if (initialOption !== selectedOption) {
      setSelectedOption(initialOption)
    }
  }, [value])

  const handleOptionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedOption(Number(e.target.value))
    },
    [setSelectedOption]
  )

  const shouldRenderStockColors =
    selectedOption === Options.BASICS || (isStockColor && selectedOption !== Options.CUSTOM)

  return (
    <div className="Color Field">
      <HybridField
        label={label}
        options={OPTIONS}
        value={selectedOption}
        secondaryType={
          shouldRenderStockColors ? HybridFieldTypes.FieldType.DROPDOWN : HybridFieldTypes.FieldType.COLOR_PICKER
        }
        secondaryOptions={getColorOptions()}
        secondaryValue={selectedOption === Options.BASICS ? stockColor ?? COLORS[0].value : value}
        onChange={handleOptionChange}
        onChangeSecondary={onChange}
      />
    </div>
  )
}

export default React.memo(ColorField)
