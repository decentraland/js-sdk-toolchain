import { components } from '../../packages/@dcl/ecs/src'
import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { CrdtMessageProtocol } from '../../packages/@dcl/ecs/src/serialization/crdt'
import { readMessage } from '../../packages/@dcl/ecs/src/serialization/crdt/message'
import { PutComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/putComponent'
import { CRDT_MESSAGE_HEADER_LENGTH, CrdtMessageType } from '../../packages/@dcl/ecs/src/serialization/crdt/types'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

/** A type the reader does not know, which takes the "skip by length" branch. */
const UNKNOWN_MESSAGE_TYPE = CrdtMessageType.MAX_MESSAGE_TYPE

/** Where a component update stores the length of the data that follows its fixed fields. */
const PUT_COMPONENT_DATA_LENGTH_OFFSET = CRDT_MESSAGE_HEADER_LENGTH + PutComponentOperation.MESSAGE_HEADER_LENGTH - 4

/** A frame with the given header followed by zero bytes up to `totalBytes`. */
function craftFrame(
  type: number,
  declaredLength: number,
  totalBytes: number = Math.max(declaredLength, CRDT_MESSAGE_HEADER_LENGTH)
): Uint8Array {
  const bytes = new Uint8Array(totalBytes)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, declaredLength, true)
  view.setUint32(4, type, true)
  return bytes
}

function withUint32At(bytes: Uint8Array, offset: number, value: number): Uint8Array {
  new DataView(bytes.buffer).setUint32(offset, value, true)
  return bytes
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const chunk = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    chunk.set(part, offset)
    offset += part.byteLength
  }
  return chunk
}

describe('when reading a CRDT message that declares a length of zero', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer(craftFrame(UNKNOWN_MESSAGE_TYPE, 0), 0)
  })

  it('should not validate the message', () => {
    expect(CrdtMessageProtocol.validate(buffer)).toBe(false)
  })

  it('should not hand out a header for it', () => {
    expect(CrdtMessageProtocol.getHeader(buffer)).toBe(null)
  })

  it('should refuse to consume it', () => {
    expect(CrdtMessageProtocol.consumeMessage(buffer)).toBe(false)
  })

  it('should leave the read offset untouched', () => {
    CrdtMessageProtocol.consumeMessage(buffer)

    expect(buffer.currentReadOffset()).toBe(0)
  })
})

describe('when reading a CRDT message that declares a length shorter than the header', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer(craftFrame(UNKNOWN_MESSAGE_TYPE, CRDT_MESSAGE_HEADER_LENGTH - 1), 0)
  })

  it('should not validate the message', () => {
    expect(CrdtMessageProtocol.validate(buffer)).toBe(false)
  })
})

describe('when reading a CRDT message that declares exactly the header length', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer(craftFrame(UNKNOWN_MESSAGE_TYPE, CRDT_MESSAGE_HEADER_LENGTH), 0)
  })

  it('should validate the message', () => {
    expect(CrdtMessageProtocol.validate(buffer)).toBe(true)
  })

  it('should consume it whole', () => {
    CrdtMessageProtocol.consumeMessage(buffer)

    expect(buffer.currentReadOffset()).toBe(CRDT_MESSAGE_HEADER_LENGTH)
  })
})

describe('when reading a message of a type the reader does not know', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer(craftFrame(UNKNOWN_MESSAGE_TYPE, CRDT_MESSAGE_HEADER_LENGTH + 4), 0)
  })

  it('should not read a message from it', () => {
    expect(readMessage(buffer)).toBe(null)
  })

  it('should leave the read offset untouched', () => {
    readMessage(buffer)

    expect(buffer.currentReadOffset()).toBe(0)
  })
})

describe('when reading an entity delete whose frame is only a header', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer(craftFrame(CrdtMessageType.DELETE_ENTITY, CRDT_MESSAGE_HEADER_LENGTH), 0)
  })

  it('should not read a message from it', () => {
    expect(readMessage(buffer)).toBe(null)
  })

  it('should leave the read offset untouched', () => {
    readMessage(buffer)

    expect(buffer.currentReadOffset()).toBe(0)
  })
})

describe('when reading a component update whose frame is shorter than its fixed fields', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    const halfTheFixedFields = CRDT_MESSAGE_HEADER_LENGTH + PutComponentOperation.MESSAGE_HEADER_LENGTH / 2
    buffer = new ReadWriteByteBuffer(craftFrame(CrdtMessageType.PUT_COMPONENT, halfTheFixedFields), 0)
  })

  it('should not read a message from it', () => {
    expect(readMessage(buffer)).toBe(null)
  })

  it('should leave the read offset untouched', () => {
    readMessage(buffer)

    expect(buffer.currentReadOffset()).toBe(0)
  })
})

describe('when reading an appended value whose frame is shorter than its fixed fields', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer(craftFrame(CrdtMessageType.APPEND_VALUE, CRDT_MESSAGE_HEADER_LENGTH + 4), 0)
  })

  it('should not read a message from it', () => {
    expect(readMessage(buffer)).toBe(null)
  })
})

describe('when reading a component update that announces more data than its frame holds', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    const fixedFieldsOnly = CRDT_MESSAGE_HEADER_LENGTH + PutComponentOperation.MESSAGE_HEADER_LENGTH
    const frame = craftFrame(CrdtMessageType.PUT_COMPONENT, fixedFieldsOnly)
    buffer = new ReadWriteByteBuffer(withUint32At(frame, PUT_COMPONENT_DATA_LENGTH_OFFSET, 1000), 0)
  })

  it('should not read a message from it', () => {
    expect(readMessage(buffer)).toBe(null)
  })

  it('should leave the read offset untouched', () => {
    readMessage(buffer)

    expect(buffer.currentReadOffset()).toBe(0)
  })
})

describe('when reading a component update whose data exactly fills its frame', () => {
  let buffer: ReadWriteByteBuffer
  let entity: Entity
  let data: Uint8Array

  beforeEach(() => {
    entity = 512 as Entity
    data = new Uint8Array([1, 2, 3])
    const writer = new ReadWriteByteBuffer()
    PutComponentOperation.write(entity, 1, 1, data, writer)
    buffer = new ReadWriteByteBuffer(writer.toBinary(), 0)
  })

  it('should read the update with its data', () => {
    expect(readMessage(buffer)).toMatchObject({ type: CrdtMessageType.PUT_COMPONENT, entityId: entity, data })
  })
})

describe('when reading a network entity delete that declares the length released SDKs write', () => {
  const declaredByReleasedSdks = CRDT_MESSAGE_HEADER_LENGTH + 4
  const bytesReleasedSdksWrite = CRDT_MESSAGE_HEADER_LENGTH + 8
  let entity: Entity
  let networkId: number

  beforeEach(() => {
    entity = 512 as Entity
    networkId = 7
  })

  describe('and the chunk holds the sixteen bytes that follow the header', () => {
    let buffer: ReadWriteByteBuffer

    beforeEach(() => {
      let frame = craftFrame(CrdtMessageType.DELETE_ENTITY_NETWORK, declaredByReleasedSdks, bytesReleasedSdksWrite)
      frame = withUint32At(frame, CRDT_MESSAGE_HEADER_LENGTH, entity)
      frame = withUint32At(frame, CRDT_MESSAGE_HEADER_LENGTH + 4, networkId)
      buffer = new ReadWriteByteBuffer(frame, 0)
    })

    it('should read the delete', () => {
      expect(readMessage(buffer)).toMatchObject({
        type: CrdtMessageType.DELETE_ENTITY_NETWORK,
        entityId: entity,
        networkId
      })
    })

    it('should consume the bytes the writer produced rather than the length it declared', () => {
      readMessage(buffer)

      expect(buffer.currentReadOffset()).toBe(bytesReleasedSdksWrite)
    })
  })

  describe('and the chunk ends where the declared length says', () => {
    let buffer: ReadWriteByteBuffer

    beforeEach(() => {
      buffer = new ReadWriteByteBuffer(craftFrame(CrdtMessageType.DELETE_ENTITY_NETWORK, declaredByReleasedSdks), 0)
    })

    it('should not read a message from it', () => {
      expect(readMessage(buffer)).toBe(null)
    })

    it('should leave the read offset untouched', () => {
      readMessage(buffer)

      expect(buffer.currentReadOffset()).toBe(0)
    })
  })
})

describe('when a transport delivers a chunk whose only message declares a length of zero', () => {
  let engine: ReturnType<typeof Engine>
  let transport: Transport

  beforeEach(() => {
    engine = Engine()
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
  })

  it('should return from the parse loop instead of spinning on the same bytes forever', () => {
    expect(() => transport.onmessage!(craftFrame(UNKNOWN_MESSAGE_TYPE, 0))).not.toThrow()
  })

  it('should leave the engine able to run its next update', async () => {
    transport.onmessage!(craftFrame(UNKNOWN_MESSAGE_TYPE, 0))

    await expect(engine.update(1)).resolves.toBeUndefined()
  })
})

describe('when a transport delivers a header-only entity delete followed by a valid component update', () => {
  let engine: ReturnType<typeof Engine>
  let transport: Transport
  let Transform: ReturnType<typeof components.Transform>
  let entity: Entity
  let chunk: Uint8Array

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
    entity = 512 as Entity

    const data = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      },
      data
    )
    const update = new ReadWriteByteBuffer()
    PutComponentOperation.write(entity, 1, Transform.componentId, data.toBinary(), update)
    chunk = concat(craftFrame(CrdtMessageType.DELETE_ENTITY, CRDT_MESSAGE_HEADER_LENGTH), update.toBinary())
  })

  it('should not throw from the transport', () => {
    expect(() => transport.onmessage!(chunk)).not.toThrow()
  })

  it('should still apply the update that follows the malformed message', async () => {
    transport.onmessage!(chunk)
    await engine.update(1)

    expect(Transform.getOrNull(entity)?.position).toEqual({ x: 1, y: 2, z: 3 })
  })
})

describe('when a transport delivers a component update that announces more data than its frame holds', () => {
  let engine: ReturnType<typeof Engine>
  let transport: Transport
  let chunk: Uint8Array

  beforeEach(() => {
    engine = Engine()
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
    const fixedFieldsOnly = CRDT_MESSAGE_HEADER_LENGTH + PutComponentOperation.MESSAGE_HEADER_LENGTH
    chunk = withUint32At(
      craftFrame(CrdtMessageType.PUT_COMPONENT, fixedFieldsOnly),
      PUT_COMPONENT_DATA_LENGTH_OFFSET,
      1000
    )
  })

  it('should not throw from the transport', () => {
    expect(() => transport.onmessage!(chunk)).not.toThrow()
  })

  it('should leave the engine able to run its next update', async () => {
    transport.onmessage!(chunk)

    await expect(engine.update(1)).resolves.toBeUndefined()
  })
})
