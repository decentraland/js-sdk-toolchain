import { useCallback } from 'react'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'

import { ContextMenu as Menu } from '../../ContexMenu'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { SelectField } from '../SelectField'
import { TextField } from '../TextField'
import { Props } from './types'
import { fromTextShape, toTextShape, isValidInput, FONTS, TEXT_ALIGN_MODES } from './utils'
import { ColorField } from '../ColorField'

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const { handleAction } = useContextMenu()
    const { TextShape } = sdk.components

    const hasTextShape = useHasComponent(entity, TextShape)
    const { getInputProps } = useComponentInput(entity, TextShape, fromTextShape, toTextShape, isValidInput)

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, TextShape)
      await sdk.operations.dispatch()
    }, [])

    if (!hasTextShape) return null

    return (
      <Container label="TextShape" className="TextShape">
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <Block>
          <TextField label="Value" type="text" {...getInputProps('text')} />
        </Block>
        <Block label="Font">
          <SelectField label="Font" options={FONTS} {...getInputProps('font')} />
          <TextField label="Size" type="number" {...getInputProps('fontSize')} />
          {/* TBD <TextField label="Color" {...getInputProps('color')} /> */}
          <TextField label="Auto size" type="checkbox" {...getInputProps('fontAutoSize', (e) => e.target.checked)} />
        </Block>
        <Block label="Shape">
          <TextField label="Width" type="number" {...getInputProps('width')} />
          <TextField label="Height" type="number" {...getInputProps('height')} />
        </Block>
        <Block label="Text">
          <SelectField label="Align" options={TEXT_ALIGN_MODES} {...getInputProps('textAlign')} />
          <TextField label="Wrapping" type="checkbox" {...getInputProps('textWrapping', (e) => e.target.checked)} />
        </Block>
        <Block label="Color">
          <ColorField {...getInputProps('textColor')}/>
        </Block>
        <Block label="Padding">
          <TextField label="↑" type="number" {...getInputProps('paddingTop')} />
          <TextField label="→" type="number" {...getInputProps('paddingRight')} />
          <TextField label="↓" type="number" {...getInputProps('paddingBottom')} />
          <TextField label="←" type="number" {...getInputProps('paddingLeft')} />
        </Block>
        <Block label="Line">
          <TextField label="Spacing" type="number" {...getInputProps('lineSpacing')} />
          <TextField label="Count" type="number" {...getInputProps('lineCount')} />
        </Block>
        <Block label="Outline">
          <TextField label="Width" type="number" {...getInputProps('outlineWidth')} />
        </Block>
        <Block label="Outline color">
          <ColorField {...getInputProps('outlineColor')}/>
        </Block>
        <Block label="Shadow">
          <TextField label="Blur" type="number" {...getInputProps('shadowBlur')} />
          <TextField label="Offset X" type="number" {...getInputProps('shadowOffsetX')} />
          <TextField label="Offset Y" type="number" {...getInputProps('shadowOffsetY')} />
        </Block>
        <Block label="Shadow color">
          <ColorField {...getInputProps('shadowColor')}/>
        </Block>
      </Container>
    )
  })
)
