import React from 'react'
import { SdkContext } from '../../components/SdkProvider/SdkProvider'

export const useRenderer = () => {
  const { renderer } = React.useContext(SdkContext)
  return renderer
}
