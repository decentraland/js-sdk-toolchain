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
import { FileUploadField, Dropdown } from '../../ui'
import { Props } from './types'
import { fromGltf, toGltf, isValidInput, COLLISION_LAYERS, isModel } from './utils'
import { useAppSelector } from '../../../redux/hooks'
import { selectAssetCatalog } from '../../../redux/app'

import './GltfInspector.css'

const DROP_TYPES = ['project-asset']

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const files = useAppSelector(selectAssetCatalog)
    const { handleAction } = useContextMenu()
    const { GltfContainer } = sdk.components

    const hasGltf = useHasComponent(entity, GltfContainer)
    const handleInputValidation = useCallback(
      ({ src }: { src: string }) => !!files && isValidInput(files, src),
      [files]
    )
    const { getInputProps, isValid } = useComponentInput(
      entity,
      GltfContainer,
      fromGltf(files?.basePath ?? ''),
      toGltf(files?.basePath ?? ''),
      handleInputValidation,
      [files]
    )

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, GltfContainer)
      await sdk.operations.dispatch()
    }, [])

    const handleDrop = useCallback(async (src: string) => {
      const { operations } = sdk
      operations.updateValue(GltfContainer, entity, { src })
      await operations.dispatch()
    }, [])

    if (!hasGltf) return null

    return (
      <Container label="GLTF" className="GltfInspector">
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <Block label="Path">
          <FileUploadField
            {...getInputProps('src')}
            onDrop={handleDrop}
            error={files && !isValid}
            isValidFile={isModel}
          />
        </Block>
        <Block label="Collision">
          <Dropdown
            label="Visible layer"
            options={COLLISION_LAYERS}
            {...getInputProps('visibleMeshesCollisionMask')}
            error={'saquese palla'}
          />
          <Dropdown
            label="Invisible layer"
            options={COLLISION_LAYERS}
            {...getInputProps('invisibleMeshesCollisionMask')}
          />
        </Block>
      </Container>
    )
  })
)
