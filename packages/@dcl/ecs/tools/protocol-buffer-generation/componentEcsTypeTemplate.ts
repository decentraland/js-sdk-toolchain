const ecsFileProtocolBuffer = `import { EcsType } from '../../built-in-types/EcsType'
import { ByteBuffer } from '../../serialization/ByteBuffer'
import { PBComponent } from './pb/Component'

/**
 * @internal
 */
export const COMPONENT_ID = INVALID_COMPONENT_ID

/**
 * @internal
 */
export const Component: EcsType<PBComponent> = {
  serialize(value: PBComponent, builder: ByteBuffer): void {
    const writer = PBComponent.encode(value)
    const buffer = new Uint8Array(writer.finish(), 0, writer.len)
    builder.writeBuffer(buffer, false)
  },
  deserialize(reader: ByteBuffer): PBComponent {
    return PBComponent.decode(reader.buffer(), reader.remainingBytes())
  }
}
`

export default ecsFileProtocolBuffer
