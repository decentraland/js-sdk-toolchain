import React from 'react'
import { Props } from './types'
import './Block.css'

const Block: React.FC<React.PropsWithChildren<Props>> = (props) => {
  return (
    <div className="Block">
      {props.label && <label>{props.label}</label>}
      <div className="content">{props.children}</div>
    </div>
  )
}

export default React.memo(Block)
