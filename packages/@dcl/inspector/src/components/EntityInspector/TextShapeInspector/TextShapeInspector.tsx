import { useCallback } from 'react'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField, CheckboxField, ColorField, Dropdown, TextArea } from '../../ui'
import { Props } from './types'
import { fromTextShape, toTextShape, isValidInput, TEXT_ALIGN_MODES } from './utils'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'

export default withSdk<Props>(({ sdk, entity }) => {
  const { TextShape } = sdk.components

  const hasTextShape = useHasComponent(entity, TextShape)
  const [componentValue, _] = useComponentValue(entity, TextShape)
  const { getInputProps } = useComponentInput(entity, TextShape, fromTextShape, toTextShape, isValidInput)

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, TextShape)
    await sdk.operations.dispatch()
  }, [])

  if (!hasTextShape) return null

  return (
    <Container label="TextShape" className="TextShape" onRemoveContainer={handleRemove}>
      <Block>
        <TextArea label="Text" {...getInputProps('text')} />
      </Block>
      <Block>
        <ColorField label="Text Color" {...getInputProps('textColor')} />
      </Block>
      <Block label="Font Size">
        <TextField autoSelect type="number" {...getInputProps('fontSize')} />
        <CheckboxField
          label="Font Auto-Size"
          {...getInputProps('fontAutoSize', (e) => e.target.checked)}
          checked={componentValue.fontAutoSize}
        />
      </Block>
      <Block label="Text Align">
        <Dropdown options={TEXT_ALIGN_MODES} {...getInputProps('textAlign')} />
      </Block>
      <Block label="Padding">
        <TextField autoSelect leftLabel="↑" type="number" {...getInputProps('paddingTop')} />
        <TextField autoSelect leftLabel="→" type="number" {...getInputProps('paddingRight')} />
        <TextField autoSelect leftLabel="↓" type="number" {...getInputProps('paddingBottom')} />
        <TextField autoSelect leftLabel="←" type="number" {...getInputProps('paddingLeft')} />
      </Block>
      <Block label="Line">
        <TextField autoSelect leftLabel="Spacing" type="number" {...getInputProps('lineSpacing')} />
      </Block>
      <Block>
        <TextField autoSelect label="Outline Width" type="number" {...getInputProps('outlineWidth')} />
      </Block>
      <Block>
        <TextField autoSelect label="Width" type="number" {...getInputProps('width')} />
        <TextField autoSelect label="Height" type="number" {...getInputProps('height')} />
        <CheckboxField
          label="Text wrapping"
          {...getInputProps('textWrapping', (e) => e.target.checked)}
          checked={componentValue.textWrapping}
        />
      </Block>
      <Block>
        <ColorField label="Outline color" {...getInputProps('outlineColor')} />
      </Block>
    </Container>
  )
})
