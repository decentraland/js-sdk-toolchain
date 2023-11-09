import { useCallback } from 'react'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { SelectField } from '../SelectField'
import { TextField, CheckboxField, ColorField } from '../../ui'
import { Props } from './types'
import { fromTextShape, toTextShape, isValidInput, FONTS, TEXT_ALIGN_MODES } from './utils'

export default withSdk<Props>(({ sdk, entity }) => {
  const { TextShape } = sdk.components

  const hasTextShape = useHasComponent(entity, TextShape)
  const { getInputProps } = useComponentInput(entity, TextShape, fromTextShape, toTextShape, isValidInput)

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, TextShape)
    await sdk.operations.dispatch()
  }, [])

  if (!hasTextShape) return null

  return (
    <Container label="TextShape" className="TextShape" onRemoveContainer={handleRemove}>
      <Block>
        <TextField leftLabel="Value" type="text" {...getInputProps('text')} />
      </Block>
      <Block label="Font">
        <SelectField label="Font" options={FONTS} {...getInputProps('font')} />
        <TextField leftLabel="Size" type="number" {...getInputProps('fontSize')} />
        {/* TBD <TextField label="Color" {...getInputProps('color')} /> */}
        <CheckboxField label="Auto size" {...getInputProps('fontAutoSize', (e) => e.target.checked)} />
      </Block>
      <Block label="Shape">
        <TextField leftLabel="Width" type="number" {...getInputProps('width')} />
        <TextField leftLabel="Height" type="number" {...getInputProps('height')} />
      </Block>
      <Block label="Text">
        <SelectField label="Align" options={TEXT_ALIGN_MODES} {...getInputProps('textAlign')} />
        <CheckboxField label="Wrapping" {...getInputProps('textWrapping', (e) => e.target.checked)} />
      </Block>
      <Block label="Color">
        <ColorField {...getInputProps('textColor')} />
      </Block>
      <Block label="Padding">
        <TextField leftLabel="↑" type="number" {...getInputProps('paddingTop')} />
        <TextField leftLabel="→" type="number" {...getInputProps('paddingRight')} />
        <TextField leftLabel="↓" type="number" {...getInputProps('paddingBottom')} />
        <TextField leftLabel="←" type="number" {...getInputProps('paddingLeft')} />
      </Block>
      <Block label="Line">
        <TextField leftLabel="Spacing" type="number" {...getInputProps('lineSpacing')} />
        <TextField leftLabel="Count" type="number" {...getInputProps('lineCount')} />
      </Block>
      <Block label="Outline">
        <TextField leftLabel="Width" type="number" {...getInputProps('outlineWidth')} />
      </Block>
      <Block label="Outline color">
        <ColorField {...getInputProps('outlineColor')} />
      </Block>
      <Block label="Shadow">
        <TextField leftLabel="Blur" type="number" {...getInputProps('shadowBlur')} />
        <TextField leftLabel="Offset X" type="number" {...getInputProps('shadowOffsetX')} />
        <TextField leftLabel="Offset Y" type="number" {...getInputProps('shadowOffsetY')} />
      </Block>
      <Block label="Shadow color">
        <ColorField {...getInputProps('shadowColor')} />
      </Block>
    </Container>
  )
})
