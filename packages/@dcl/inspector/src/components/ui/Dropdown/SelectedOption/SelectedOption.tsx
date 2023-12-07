import React from 'react'
import { Option } from '../Option'
import { MultipleOption } from '../MultipleOption'
import { Props as OptionProp } from '../Option/types'
import { Props } from './types'
import './SelectedOption.css'

const SelectedOption: React.FC<Props> = (props) => {
  const { minWidth, multiple, selectedValue, onRemove } = props
  return (
    <div className="SelectedOptionContainer">
      {multiple ? (
        <MultipleOption
          className="SelectedOption"
          value={selectedValue as OptionProp[]}
          minWidth={minWidth}
          onRemove={onRemove}
        />
      ) : (
        <Option {...selectedValue} className="SelectedOption" minWidth={minWidth} />
      )}
    </div>
  )
}

export default React.memo(SelectedOption)
