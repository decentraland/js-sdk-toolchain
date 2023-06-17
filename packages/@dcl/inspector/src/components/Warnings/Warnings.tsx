import React from 'react'
import { RotationGizmoLocalAlignmentDisabled } from './RotationGizmoLocalAlignmentDisabled'
import './Warnings.css'
import { SocketConnection } from './SocketConnection'

const Warnings: React.FC = () => {
  return (
    <div className="Warnings">
      <RotationGizmoLocalAlignmentDisabled />
      <SocketConnection />
    </div>
  )
}

export default React.memo(Warnings)
