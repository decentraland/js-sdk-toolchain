import React from 'react'
import { Props } from './types'
import classnames from 'classnames'
import './Container.css'

const Container: React.FC<React.PropsWithChildren<Props>> = (props) => {
  return (
    <div className={classnames('Container', props.className)}>
      {props.label && <label>{props.label}</label>}
      <div className="content">{props.children}</div>
    </div>
  )
}

export default React.memo(Container)
