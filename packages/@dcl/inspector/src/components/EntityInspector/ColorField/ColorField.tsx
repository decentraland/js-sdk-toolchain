import React, { useCallback, useState } from 'react'

import { SelectField } from '../SelectField'
import { Props } from './types'

import './ColorField.css'
import { OPTIONS, COLORS, Options } from './utils'

const ColorField: React.FC<Props> = (props) => {
  const stockColor = COLORS.find(($) => $.value === props.value)?.value
  const isStockColor = !!stockColor
  const initialOption = isStockColor ? Options.PICK : Options.CUSTOM
  const [selectedOption, setSelectedOption] = useState(initialOption)
  const { label, onChange } = props

  const handleOptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(Number(e.target.value))
  }, [])

  const shouldRenderStockColors = selectedOption === Options.PICK || (isStockColor && selectedOption !== Options.CUSTOM)

  return (
    <div className="ColorField">
      {label && <label>{label}</label>}
      <SelectField options={OPTIONS} value={selectedOption} onChange={handleOptionChange} />
      {shouldRenderStockColors ? (
        <>
          <SelectField value={stockColor} options={COLORS} onChange={onChange} />
          <div className="preview-color" style={{ backgroundColor: stockColor || COLORS[0].value }} />
        </>
      ) : (
        <>
          <input type="color" value={props.value} onChange={onChange} />
          <div className="preview-hex">{props.value?.toString().toUpperCase()}</div>
        </>
      )}
    </div>
  )
}

export default React.memo(ColorField)
