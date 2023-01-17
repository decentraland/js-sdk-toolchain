import { componentNumberFromName } from '../../packages/@dcl/ecs/src/components/component-number'
import { coreComponentMappings } from '../../packages/@dcl/ecs/src/components/generated/component-names.gen'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

describe('component number generator', () => {
  it('all core components resolve to a <2048 number', () => {
    for (const [key, value] of Object.entries(coreComponentMappings)) {
      expect({ [key]: componentNumberFromName(key) }).toEqual({ [key]: value })
      expect(componentNumberFromName(key)).toBeLessThan(2048)
    }
  })
  it('it always returns unsigned integers', () => {
    const testCases: string[] = [
      'a',
      'b',
      'c',
      'aaa',
      'bbb',
      'ccc',
      'PositionSchema',
      'VelocitySchema',
      'string',
      '8888',
      'bouncing billboard',
      '889',
      'MoveTransportData',
      'MoveTransportData2',
      'my-scene::Door',
      'int8'
    ]

    for (const key of testCases) {
      expect(componentNumberFromName(key)).toBeGreaterThan(0)
    }
  })
})

describe('bytebuffer', () => {
  it('ensure that unsigned ints are properly stored', () => {
    const writeBuffer = new ReadWriteByteBuffer()
    writeBuffer.writeInt32(-1)
    writeBuffer.writeInt32(0xffff_ffff)
    expect(writeBuffer.readUint32()).toEqual(0xffffffff)
    expect(writeBuffer.readUint32()).toEqual(0xffffffff)
  })
})
