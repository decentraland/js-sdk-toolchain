import React from 'react'
import { RotationGizmoLocalAlignmentDisabled } from './RotationGizmoLocalAlignmentDisabled'
import './Warnings.css'

const Warnings: React.FC = () => {
  return (
    <div className="Warnings">
      <RotationGizmoLocalAlignmentDisabled />
    </div>
  )
}

export default React.memo(Warnings)
