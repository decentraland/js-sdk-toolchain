import React from 'react'

import { useAppSelector } from '../../../redux/hooks'
import { selectSession } from '../../../redux/app'
import { Info } from '../Info'

const Participants: React.FC = () => {
  const { participants } = useAppSelector(selectSession)
  if (!participants.length) return null
  return <Info title={<span>{`Participants in session: ${participants.length} (+ you)`}</span>} />
}

export default React.memo(Participants)
