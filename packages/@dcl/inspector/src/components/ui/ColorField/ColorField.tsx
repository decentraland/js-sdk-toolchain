import React, { useCallback, useEffect, useState } from 'react'
import { HybridField, Types as HybridFieldTypes } from '../HybridField'
import { OPTIONS, COLORS, Options } from './utils'
import { Props } from './types'

import './ColorField.css'

const ColorField: React.FC<Props> = ({ label, value, onChange }) => {
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
        secondaryOptions={COLORS.map((color) => ({
          ...color,
          leftContent: <div className="ColorPreview" style={{ backgroundColor: color.value }} />,
          secondaryText: color.value
        }))}
        secondaryValue={selectedOption === Options.BASICS ? stockColor ?? COLORS[0].value : value}
        onChange={handleOptionChange}
        onChangeSecondary={onChange}
      />
    </div>
  )
}

export default React.memo(ColorField)
