import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { Color3 } from '../../../packages/@dcl/sdk/math'
import { testComponentSerialization } from './assertion'

describe('Generated AvatarNametag ProtoBuf', () => {
  it('should serialize/deserialize AvatarNametag with default values', () => {
    const newEngine = Engine()
    const AvatarNametag = components.AvatarNametag(newEngine)

    testComponentSerialization(AvatarNametag, {
      label: '',
      labelColor: undefined,
      backgroundColor: undefined,
      borderColor: undefined
    })
  })

  it('should serialize/deserialize AvatarNametag with a full payload', () => {
    const newEngine = Engine()
    const AvatarNametag = components.AvatarNametag(newEngine)

    testComponentSerialization(AvatarNametag, {
      label: 'Club Owner',
      labelColor: Color3.Red(),
      backgroundColor: Color3.Black(),
      borderColor: Color3.Yellow()
    })
  })

  it('should serialize/deserialize AvatarNametag with optional colors omitted', () => {
    const newEngine = Engine()
    const AvatarNametag = components.AvatarNametag(newEngine)

    testComponentSerialization(AvatarNametag, {
      label: 'boedo-casla',
      labelColor: undefined,
      backgroundColor: undefined,
      borderColor: undefined
    })
  })
})
