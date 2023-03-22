import React, { useEffect } from 'react'
import { SdkContext } from '../../components/SdkProvider/SdkProvider'

export const useRenderer = (cb: () => React.RefObject<HTMLCanvasElement>) => {
  const { renderer } = React.useContext(SdkContext)
  useEffect(() => {
    renderer(cb())
  }, [])
}
