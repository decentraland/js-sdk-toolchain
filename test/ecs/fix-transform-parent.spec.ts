import { Entity } from '../../packages/@dcl/ecs/src/engine'
import { TransformSchema } from '../../packages/@dcl/ecs/src/components/manual/Transform'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { fixTransformParent } from '../../packages/@dcl/ecs/src/serialization/crdt/network/utils'
import { ReceiveMessage } from '../../packages/@dcl/ecs/src/systems/crdt/types'

function transformAt(x: number) {
  return {
    position: { x, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    parent: 0 as Entity
  }
}

function positionOf(data: Uint8Array) {
  return TransformSchema.deserialize(new ReadWriteByteBuffer(data)).position.x
}

describe('when two transforms are given a parent in the same batch', () => {
  let first: Uint8Array
  let second: Uint8Array

  beforeEach(() => {
    const message = {} as ReceiveMessage
    first = fixTransformParent(message, transformAt(1), 100 as Entity)
    second = fixTransformParent(message, transformAt(2), 200 as Entity)
  })

  it('should leave the first one describing its own transform', () => {
    expect(positionOf(first)).toBe(1)
  })

  it('should have the second one describe its own transform', () => {
    expect(positionOf(second)).toBe(2)
  })

  it('should give each one its own parent', () => {
    const parents = [first, second].map((data) => TransformSchema.deserialize(new ReadWriteByteBuffer(data)).parent)

    expect(parents).toEqual([100, 200])
  })
})
