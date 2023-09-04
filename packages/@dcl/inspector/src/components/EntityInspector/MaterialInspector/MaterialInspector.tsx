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
import { SelectField } from '../SelectField'
import { TextField } from '../TextField'
import { Container } from '../../Container'
import { Texture, Props as TextureProps } from './Texture'
import { Props, MaterialType, TextureType } from './types'
import { fromMaterial, toMaterial, isValidInput, MATERIAL_TYPES, TRANSPARENCY_MODES } from './utils'
import { ColorField } from '../ColorField'

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const { handleAction } = useContextMenu()
    const { Material } = sdk.components

    const hasMaterial = useHasComponent(entity, Material)
    const { getInputProps, isValid } = useComponentInput(entity, Material, fromMaterial, toMaterial, isValidInput)

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, Material)
      await sdk.operations.dispatch()
    }, [])

    if (!hasMaterial) return null

    const materialType = getInputProps('type')
    const castShadows = getInputProps('castShadows', (e) => e.target.checked)
    const getTextureProps = getInputProps as TextureProps['getInputProps']

    return (
      <Container label="Material" className="Material">
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <Block label="Material">
          <SelectField label="Type" options={MATERIAL_TYPES} {...materialType} />
        </Block>
        <Block>
          <TextField label="Alpha test" {...getInputProps('alphaTest')} />
          <TextField label="Cast shadows" type="checkbox" checked={!!castShadows.value} {...castShadows} />
        </Block>
        <Block>
          <ColorField label="Diffuse color" {...getInputProps('diffuseColor')}/>
        </Block>
        <Block>
          <SelectField label="Transparency mode" options={TRANSPARENCY_MODES} {...getInputProps('transparencyMode')} />
        </Block>
        <Block>
          <TextField label="Metallic" type="number" {...getInputProps('metallic')} />
          <TextField label="Roughness" type="number" {...getInputProps('roughness')} />
        </Block>
        <Block label="Intensity">
          <TextField label="Specular" type="number" {...getInputProps('specularIntensity')} />
          <TextField label="Emissive" type="number" {...getInputProps('emissiveIntensity')} />
          <TextField label="Direct" type="number" {...getInputProps('directIntensity')} />
        </Block>
        <Texture label="Texture" texture={TextureType.TT_TEXTURE} getInputProps={getTextureProps} />
        {materialType.value === MaterialType.MT_PBR && (<>
          <Texture label="Alpha texture" texture={TextureType.TT_ALPHA_TEXTURE} getInputProps={getTextureProps} />
          <Texture label="Bump texture" texture={TextureType.TT_BUMP_TEXTURE} getInputProps={getTextureProps} />
          <Texture label="Emissive texture" texture={TextureType.TT_EMISSIVE_TEXTURE} getInputProps={getTextureProps} />
        </>)}
      </Container>
    )
  })
)
