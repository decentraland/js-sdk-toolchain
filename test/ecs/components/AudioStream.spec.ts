﻿import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated AudioStream ProtoBuf', () => {
  it('should serialize/deserialize AudioStream', () => {
    const newEngine = Engine()
    const { AudioStream } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _audioStream = AudioStream.create(entity, {
      playing: true,
      volume: 1,
      url: 'FakeUrl'
    })

    AudioStream.create(entityB, {
      playing: false,
      volume: 0,
      url: 'FakeUrl2'
    })
    const buffer = AudioStream.toBinary(entity)
    AudioStream.updateFromBinary(entityB, buffer)

    expect(_audioStream).toBeDeepCloseTo({ ...AudioStream.getMutable(entityB) })

    expect(AudioStream.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...AudioStream.getMutable(entity)
    })
  })
})
