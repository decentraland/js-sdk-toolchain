import { useCallback } from 'react'
import { Menu, Item } from 'react-contexify';
import { AiFillDelete as DeleteIcon} from 'react-icons/ai'

import { isValidNumericInput, useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'

import { Props } from './types'
import { fromTranform, toTransform } from './utils'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu';

export default withSdk<Props>(withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
  const { Transform } = sdk.components

  const hasTransform = useHasComponent(entity, Transform)
  const getInputProps = hasTransform && useComponentInput(entity, Transform, fromTranform, toTransform, isValidNumericInput)
  const { handleAction } = useContextMenu()

  const handleRemove = useCallback(() => Transform.deleteFrom(entity), [])

  if (!getInputProps) {
    return null
  }

  return (
    <Container label="Transform" className="Transform">
      <Menu id={contextMenuId}>
        <Item id="delete" onClick={handleAction(handleRemove)}><DeleteIcon /> Delete</Item>
      </Menu>
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
}))
