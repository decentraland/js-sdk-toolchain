import { isValidNumericInput, useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { withSdk } from '../../../hoc/withSdk'
import { Props } from './types'
import { fromTranform, toTransform } from './utils'
import { Block } from '../Block'
import { Container } from '../Container'
import { TextField } from '../TextField'

export default withSdk<Props>(({ sdk, entity }) => {
  const { Transform } = sdk.components

  const hasTransform = useHasComponent(entity, Transform)
  const getInputProps = hasTransform && useComponentInput(entity, Transform, fromTranform, toTransform, isValidNumericInput)

  if (!getInputProps) {
    return null
  }

  return (
    <Container label="Transform" className="Transform">
      <Block label="Position">
        <TextField label="X" type="number" fractionDigits={2} {...getInputProps('position.x')} />
        <TextField label="Y" type="number" fractionDigits={2} {...getInputProps('position.y')} />
        <TextField label="Z" type="number" fractionDigits={2} {...getInputProps('position.z')} />
      </Block>
      <Block label="Scale">
        <TextField label="X" type="number" fractionDigits={2} {...getInputProps('scale.x')} />
        <TextField label="Y" type="number" fractionDigits={2} {...getInputProps('scale.y')} />
        <TextField label="Z" type="number" fractionDigits={2} {...getInputProps('scale.z')} />
      </Block>
      <Block label="Rotation">
        <TextField label="X" type="number" fractionDigits={2} {...getInputProps('rotation.x')} />
        <TextField label="Y" type="number" fractionDigits={2} {...getInputProps('rotation.y')} />
        <TextField label="Z" type="number" fractionDigits={2} {...getInputProps('rotation.z')} />
      </Block>
    </Container>
  )
})
