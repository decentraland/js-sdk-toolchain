const ecsFileProtocolBuffer = `import { ISchema } from '../../schemas/ISchema'
import { ByteBuffer } from '../../serialization/ByteBuffer'
import { PB$\{ComponentName\} } from './pb/Component.gen'
export { PB$\{ComponentName\} }

/**
 * @internal
 */
export const COMPONENT_ID = $\{ComponentId\}

/**
 * @internal
 */
export const $\{ComponentName\}Schema: ISchema<PB$\{ComponentName\}> = {
  serialize(value: PB$\{ComponentName\}, builder: ByteBuffer): void {
    const writer = PB$\{ComponentName\}.encode(value)
    const buffer = new Uint8Array(writer.finish(), 0, writer.len)
    builder.writeBuffer(buffer, false)
  },
  deserialize(reader: ByteBuffer): PB$\{ComponentName\} {
    return PB$\{ComponentName\}.decode(reader.buffer(), reader.remainingBytes())
  },
  create(): PB$\{ComponentName\} {
    // TODO: this is a hack.
    return PB$\{ComponentName\}.decode(new Uint8Array())
  }
}
`

export default ecsFileProtocolBuffer
