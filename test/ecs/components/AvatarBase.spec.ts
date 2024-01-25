import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { Color3 } from '../../../packages/@dcl/sdk/math'
import { testComponentSerialization } from './assertion'

describe('Generated AvatarBase ProtoBuf', () => {
  it('should serialize/deserialize AvatarBase', () => {
    const newEngine = Engine()
    const AvatarBase = components.AvatarBase(newEngine)

    testComponentSerialization(AvatarBase, {
      skinColor: Color3.Green(),
      eyesColor: Color3.Black(),
      hairColor: Color3.Magenta(),
      bodyShapeUrn: 'boedo-shape-urn',
      name: 'boedo-casla'
    })
  })
})
