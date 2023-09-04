import { Block } from '../../../Block'
import { SelectField } from '../../SelectField'
import { TextField } from '../../TextField'
import { Container } from '../../../Container'
import { Props, Texture, TEXTURE_TYPES, WRAP_MODES, FILTER_MODES } from './types'

export default ({ label, texture, getInputProps }: Props) => {

  const type = getInputProps(`${texture}.type`)

  return (
    <Container label={label} className={label} initialOpen={false}>
      <Block>
        <SelectField label="Type" options={TEXTURE_TYPES} {...type} />
      </Block>
      <Block>
        {type.value === Texture.TT_TEXTURE && <TextField label="Path" type="text" {...getInputProps(`${texture}.src`)} />}
        {type.value === Texture.TT_AVATAR_TEXTURE && <TextField label="User ID" {...getInputProps(`${texture}.userId`)} />}
        {type.value === Texture.TT_VIDEO_TEXTURE && <TextField label="Video player entity" {...getInputProps(`${texture}.videoPlayerEntity`)} />}
      </Block>
      <Block>
        <SelectField label="Wrap mode" options={WRAP_MODES} {...getInputProps(`${texture}.wrapMode`)} />
      </Block>
      <Block>
        <SelectField label="Filter node" options={FILTER_MODES} {...getInputProps(`${texture}.filterMode`)} />
      </Block>
    </Container>
  )
}
