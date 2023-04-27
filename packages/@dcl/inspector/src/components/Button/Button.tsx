import React from 'react'
import classNames from 'classnames'

import { PropTypes } from './types'
import './Button.css'

function Button(props: PropTypes) {
  return (
    <button {...props} className={classNames('Button', props.className)}>
      {props.children}
    </button>
  )
}

export default Button