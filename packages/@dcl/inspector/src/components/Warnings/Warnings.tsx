import React from 'react'

import { RotationGizmoLocalAlignmentDisabled } from './RotationGizmoLocalAlignmentDisabled'
import { SocketConnection } from './SocketConnection'
import { SdkOperation } from './SdkOperation'
import { MultipleEntitiesSelected } from './MultipleEntitiesSelected'

import './Warnings.css'

const Warnings: React.FC = () => {
  return (
    <div className="Warnings">
      <RotationGizmoLocalAlignmentDisabled />
      <SocketConnection />
      <SdkOperation />
      <MultipleEntitiesSelected />
    </div>
  )
}

export default React.memo(Warnings)
