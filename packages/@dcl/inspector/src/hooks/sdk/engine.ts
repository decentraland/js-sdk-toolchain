import { useRef } from 'react'
import { Engine } from '@dcl/ecs'

export const useEngine = () => {
  const engineRef = useRef(() => Engine())
  return engineRef.current
}
