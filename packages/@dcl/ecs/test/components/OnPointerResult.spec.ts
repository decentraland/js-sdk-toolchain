﻿import { Engine } from '../../src/engine'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerDown', () => {
    const newEngine = Engine()
    const { OnPointerResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    OnPointerResult.create(newEngine.addEntity())
    const onPointerResult = OnPointerResult.create(entity, {
      identifier: 1,
      button: 1,
      point: { x: 1, y: 2, z: 3 },
      distance: 10,
      direction: { x: 1, y: 2, z: 3 },
      normal: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh'
    })

    OnPointerResult.create(entityB, {
      identifier: 2,
      button: 3,
      point: { x: 1, y: 2, z: 3 },
      distance: 10,
      direction: { x: 1, y: 2, z: 3 },
      normal: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh'
    })
    const buffer = OnPointerResult.toBinary(entity)
    OnPointerResult.updateFromBinary(entityB, buffer)

    const result = { ...OnPointerResult.mutable(entityB) }

    expect(onPointerResult).toEqual(result)
  })
})
