import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { withSdk } from '../../../hoc/withSdk'
import { Block } from '../Block'
import { Container } from '../Container'
import { TextField } from '../TextField'
import { Props } from './types'
import { fromScene, toScene, isValidInput } from './utils'

export default withSdk<Props>(({ sdk, entity }) => {
  const { Scene } = sdk.components

  const hasScene = useHasComponent(entity, Scene)
  const getInputProps = useComponentInput(entity, Scene, fromScene, toScene, isValidInput)

  if (!hasScene) {
    return null
  }

  return (
    <Container label="Scene" className="Scene">
      <Block label="Layout">
        <TextField label="Base" {...getInputProps('layout.base')} />
        <TextField label="Parcels" {...getInputProps('layout.parcels')} />
      </Block>
    </Container>
  )
})
