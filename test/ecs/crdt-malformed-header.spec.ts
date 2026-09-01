import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { CrdtMessageProtocol } from '../../packages/@dcl/ecs/src/serialization/crdt'
import { CRDT_MESSAGE_HEADER_LENGTH, CrdtMessageType } from '../../packages/@dcl/ecs/src/serialization/crdt/types'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

/** A type the reader does not know, which takes the "skip by length" branch. */
const UNKNOWN_MESSAGE_TYPE = CrdtMessageType.MAX_MESSAGE_TYPE

function craftMessage(declaredLength: number, totalBytes = CRDT_MESSAGE_HEADER_LENGTH): Uint8Array {
  const bytes = new Uint8Array(totalBytes)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, declaredLength, true)
  view.setUint32(4, UNKNOWN_MESSAGE_TYPE, true)
  return bytes
}

describe('when reading a CRDT message that declares a length of zero', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer(craftMessage(0), 0)
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
    buffer = new ReadWriteByteBuffer(craftMessage(CRDT_MESSAGE_HEADER_LENGTH - 1), 0)
  })

  it('should not validate the message', () => {
    expect(CrdtMessageProtocol.validate(buffer)).toBe(false)
  })
})

describe('when reading a CRDT message that declares exactly the header length', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer(craftMessage(CRDT_MESSAGE_HEADER_LENGTH), 0)
  })

  it('should validate the message', () => {
    expect(CrdtMessageProtocol.validate(buffer)).toBe(true)
  })

  it('should consume it whole', () => {
    CrdtMessageProtocol.consumeMessage(buffer)

    expect(buffer.currentReadOffset()).toBe(CRDT_MESSAGE_HEADER_LENGTH)
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
    expect(() => transport.onmessage!(craftMessage(0))).not.toThrow()
  })

  it('should leave the engine able to run its next update', async () => {
    transport.onmessage!(craftMessage(0))

    await expect(engine.update(1)).resolves.toBeUndefined()
  })
})
