import React from 'react'
import { CiWarning } from 'react-icons/ci'

import './Warning.css'

type Props = {
  title: React.ReactNode
}

const Warning: React.FC<Props> = ({ title }) => {
  return (
    <div className="Warning">
      <CiWarning className="icon" />
      {title}
    </div>
  )
}

export default React.memo(Warning)
