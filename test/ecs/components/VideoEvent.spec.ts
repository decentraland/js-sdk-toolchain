import { components, Engine, VideoState } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'

describe('Generated VideoEvent ProtoBuf', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const VideoEvent = components.VideoEvent(newEngine)

    testSchemaSerializationIdentity(VideoEvent.schema, {
      timestamp: 5,
      state: VideoState.VS_LOADING,
      videoLength: 50,
      currentOffset: 1,
      tickNumber: 1
    })

    testSchemaSerializationIdentity(VideoEvent.schema, {
      timestamp: 10,
      state: VideoState.VS_PLAYING,
      videoLength: 50,
      currentOffset: 3,
      tickNumber: 2
    })

    testSchemaSerializationIdentity(VideoEvent.schema, {
      timestamp: 30,
      state: VideoState.VS_PLAYING,
      videoLength: 50,
      currentOffset: 13,
      tickNumber: 3
    })

    testSchemaSerializationIdentity(VideoEvent.schema, VideoEvent.schema.create())
  })
})
