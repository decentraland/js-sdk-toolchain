import React from 'react'
import './Box.css'

interface Props {
  className?: string
}

function Box({ children, className }: React.PropsWithChildren<Props>) {
  return (
    <div className={`bordered-box ${className ?? ''}`}>
      <div>{children}</div>
    </div>
  )
}

export default Box
