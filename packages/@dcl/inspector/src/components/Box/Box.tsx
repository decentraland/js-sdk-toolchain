import React from 'react'
import './Box.css'

interface Props {
  className?: string
}

function Box({ children, className }: React.PropsWithChildren<Props>) {
  return (
    <div className={`Box with-border ${className ?? ''}`}>
      <div className="content">{children}</div>
    </div>
  )
}

export default Box
