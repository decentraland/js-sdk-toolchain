import React, { useCallback, useState } from 'react'

import { SelectField } from '../SelectField'
import { Props } from './types'

import './ColorField.css'
import { OPTIONS, COLORS, Options } from './utils'
import { TextField } from '../TextField'

const ColorField: React.FC<Props> = (props) => {
  const isCustomColor = !COLORS.find(($) => $.value === props.value)
  const initialOption = isCustomColor ? Options.CUSTOM : Options.PICK
  const [selectedOption, setSelectedOption] = useState(initialOption)
  const { label, onChange } = props

  const handleOptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(Number(e.target.value))
  }, [])

  return (
    <div className="ColorField">
      {label && <label>{label}</label>}
      <SelectField options={OPTIONS} value={selectedOption} onChange={handleOptionChange}/>
      {selectedOption === Options.PICK && !isCustomColor && <SelectField options={COLORS} onChange={onChange} />}
      {(selectedOption === Options.CUSTOM || isCustomColor) && <TextField value={props.value} onChange={onChange} />}
      <div className="preview-color" style={{ backgroundColor: `${props.value}` }}></div>
    </div>
  )
}

export default React.memo(ColorField)
