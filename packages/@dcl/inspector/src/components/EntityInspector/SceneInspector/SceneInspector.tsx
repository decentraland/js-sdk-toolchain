import { useCallback, useState } from 'react'
import { RxBorderAll } from 'react-icons/rx'

import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { withSdk } from '../../../hoc/withSdk'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { Props } from './types'
import { fromScene, toScene, toSceneAuto, getInputValidation } from './utils'

import './SceneInspector.css'

export default withSdk<Props>(({ sdk, entity }) => {
  const [auto, setAuto] = useState(false)
  const { Scene } = sdk.components

  const hasScene = useHasComponent(entity, Scene)
  const { getInputProps } = useComponentInput(
    entity,
    Scene,
    fromScene,
    auto ? toSceneAuto : toScene,
    getInputValidation(auto)
  )
  const parcelsProps = getInputProps('layout.parcels')

  const handleClick = useCallback(() => {
    setAuto(!auto)
  }, [auto])

  if (!hasScene) {
    return null
  }

  return (
    <Container label="Settings" className="Scene">
      <Block label="Parcels">
        <TextField {...parcelsProps} />
        <RxBorderAll onClick={handleClick} style={{ opacity: auto ? 1 : 0.3 }} />
      </Block>
    </Container>
  )
})
