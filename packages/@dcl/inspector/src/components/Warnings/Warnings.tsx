import React from 'react'

import { RotationGizmoLocalAlignmentDisabled } from './RotationGizmoLocalAlignmentDisabled'
import { SocketConnection } from './SocketConnection'

import './Warnings.css'

const Warnings: React.FC = () => {
  return (
    <div className="Warnings">
      <RotationGizmoLocalAlignmentDisabled />
      <SocketConnection />
    </div>
  )
}

export default React.memo(Warnings)
