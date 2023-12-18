import React from 'react'
import { CiCircleInfo } from 'react-icons/ci'

import './Info.css'

type Props = {
  title: React.ReactNode
}

const Info: React.FC<Props> = ({ title }) => {
  return (
    <div className="Info">
      <CiCircleInfo className="icon" />
      {title}
    </div>
  )
}

export default React.memo(Info)
