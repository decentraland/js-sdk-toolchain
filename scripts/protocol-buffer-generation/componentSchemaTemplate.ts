const ecsFileProtocolBuffer = `import { ISchema } from '../../schemas/ISchema'
import { ByteBuffer } from '../../serialization/ByteBuffer'
import { PB$\{ComponentName\} } from './pb/decentraland/sdk/components/$\{ComponentFile\}.gen'

/**
 * @internal
 */
export const $\{ComponentName\}Schema: ISchema<PB$\{ComponentName\}> & { COMPONENT_ID: number } = {
  COMPONENT_ID: $\{ComponentId\},
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
  },
  jsonSchema: {
    type: "object",
    properties: {},
    serializationType: "protocol-buffer",
    protocolBuffer: "PB$\{ComponentName\}"
  }
}
`

export default ecsFileProtocolBuffer
