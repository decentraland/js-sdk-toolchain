import { useCallback, useEffect } from 'react'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'

import { ContextMenu as Menu } from '../../ContexMenu'
import { isValidNumericInput, useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'

import { Props } from './types'
import { fromTransform, toTransform, fromTransformConfig } from './utils'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { Link, Props as LinkProps } from './Link'

import './TransformInspector.css'

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const { Transform, TransformConfig } = sdk.components

    const hasTransform = useHasComponent(entity, Transform)
    const transform = Transform.getOrNull(entity) ?? undefined
    const config = TransformConfig.getOrNull(entity) ?? undefined
    const { getInputProps } = useComponentInput(
      entity,
      Transform,
      fromTransform,
      toTransform(transform, config),
      isValidNumericInput
    )
    const { getInputProps: getConfigProps } = useComponentInput(
      entity,
      TransformConfig,
      fromTransformConfig,
      fromTransformConfig
    )
    const { handleAction } = useContextMenu()

    useEffect(() => {
      if (!hasTransform) return
      if (!config) {
        sdk.operations.addComponent(entity, TransformConfig.componentId)
        void sdk.operations.dispatch()
      }
    }, [hasTransform])

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, Transform)
      await sdk.operations.dispatch()
    }, [])

    const _getConfigProps = getConfigProps as LinkProps['getInputProps']

    if (!hasTransform) return null

    return (
      <Container label="Transform" className="Transform">
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <Block label="Position">
          <TextField label="X" type="number" {...getInputProps('position.x')} />
          <TextField label="Y" type="number" {...getInputProps('position.y')} />
          <TextField label="Z" type="number" {...getInputProps('position.z')} />
        </Block>
        <Block label="Scale">
          <TextField label="X" type="number" {...getInputProps('scale.x')} />
          <TextField label="Y" type="number" {...getInputProps('scale.y')} />
          <TextField label="Z" type="number" {...getInputProps('scale.z')} />
          <Link field="porportionalScaling" getInputProps={_getConfigProps} />
        </Block>
        <Block label="Rotation">
          <TextField label="X" type="number" {...getInputProps('rotation.x')} />
          <TextField label="Y" type="number" {...getInputProps('rotation.y')} />
          <TextField label="Z" type="number" {...getInputProps('rotation.z')} />
        </Block>
      </Container>
    )
  })
)
