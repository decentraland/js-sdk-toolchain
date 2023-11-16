import { useCallback } from 'react'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useAppSelector } from '../../../redux/hooks'
import { selectAssetCatalog } from '../../../redux/app'
import { Block } from '../../Block'
import { CheckboxField, Dropdown, RangeField } from '../../ui'
import { Container } from '../../Container'
import { Texture, Props as TextureProps } from './Texture'
import { ColorField } from '../../ui/ColorField'
import { Props, MaterialType, TextureType } from './types'
import { fromMaterial, toMaterial, isValidMaterial, MATERIAL_TYPES, TRANSPARENCY_MODES } from './utils'

export default withSdk<Props>(({ sdk, entity }) => {
  const files = useAppSelector(selectAssetCatalog)
  const { Material } = sdk.components

  const hasMaterial = useHasComponent(entity, Material)
  const { getInputProps } = useComponentInput(
    entity,
    Material,
    fromMaterial(files?.basePath ?? ''),
    toMaterial(files?.basePath ?? ''),
    isValidMaterial
  )

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, Material)
    await sdk.operations.dispatch()
  }, [])

  if (!hasMaterial) return null

  const materialType = getInputProps('type')
  const castShadows = getInputProps('castShadows', (e) => e.target.checked)
  const getTextureProps = getInputProps as TextureProps['getInputProps']

  return (
    <Container label="Material" className="Material" onRemoveContainer={handleRemove}>
      <Block>
        <Dropdown label="Material" options={MATERIAL_TYPES} {...materialType} />
      </Block>
      {materialType.value === MaterialType.MT_UNLIT && (
        <>
          <Block label="Diffuse color">
            <ColorField {...getInputProps('diffuseColor')} />
          </Block>
          <Block>
            <CheckboxField label="Cast shadows" checked={!!castShadows.value} {...castShadows} />
          </Block>
          <Block>
            <RangeField label="Alpha test" max={1} step={0.1} {...getInputProps('alphaTest')} />
          </Block>
        </>
      )}
      {materialType.value === MaterialType.MT_PBR && (
        <>
          <Block>
            <CheckboxField label="Cast shadows" checked={!!castShadows.value} {...castShadows} />
          </Block>
          <Block>
            <RangeField label="Metallic" max={1} step={0.1} {...getInputProps('metallic')} />
          </Block>
          <Block>
            <RangeField label="Roughness" max={1} step={0.1} {...getInputProps('roughness')} />
          </Block>
          <Block>
            <ColorField label="Color" {...getInputProps('albedoColor')} />
          </Block>
          <Block>
            <ColorField label="Reflectivity color" {...getInputProps('reflectivityColor')} />
          </Block>
        </>
      )}

      <Texture label="Texture" texture={TextureType.TT_TEXTURE} files={files} getInputProps={getTextureProps} />

      {materialType.value === MaterialType.MT_PBR && (
        <>
          <Container label="Intensity" border>
            <RangeField label="Specular" max={1} step={0.1} {...getInputProps('specularIntensity')} />
            <RangeField label="Direct" max={1} step={0.1} {...getInputProps('directIntensity')} />
          </Container>

          <Container label="Transparency" border>
            <Block>
              <Dropdown label="Transparency Mode" options={TRANSPARENCY_MODES} {...getInputProps('transparencyMode')} />
            </Block>
            <Block>
              <RangeField label="Alpha test" max={1} step={0.1} {...getInputProps('alphaTest')} />
            </Block>
            <Texture
              label="Alpha texture"
              texture={TextureType.TT_ALPHA_TEXTURE}
              files={files}
              getInputProps={getTextureProps}
            />
          </Container>

          <Container label="Emissive" border>
            <Block>
              <RangeField label="Emissive Intensity" max={1} step={0.1} {...getInputProps('emissiveIntensity')} />
            </Block>
            <Block>
              <ColorField label="Emissive color" {...getInputProps('emissiveColor')} />
            </Block>
            <Texture
              label="Emissive texture"
              texture={TextureType.TT_EMISSIVE_TEXTURE}
              files={files}
              getInputProps={getTextureProps}
            />
          </Container>

          <Texture
            label="Bump texture"
            texture={TextureType.TT_BUMP_TEXTURE}
            files={files}
            getInputProps={getTextureProps}
          />
        </>
      )}
    </Container>
  )
})
