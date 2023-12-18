import React from 'react'

import { RotationGizmoLocalAlignmentDisabled } from './RotationGizmoLocalAlignmentDisabled'
import { SocketConnection } from './SocketConnection'
import { Participants } from './Participants'

import './InfoBoards.css'

const InfoBoards: React.FC = () => {
  return (
    <div className="InfoBoards">
      <RotationGizmoLocalAlignmentDisabled />
      <SocketConnection />
      <Participants />
    </div>
  )
}

export default React.memo(InfoBoards)
