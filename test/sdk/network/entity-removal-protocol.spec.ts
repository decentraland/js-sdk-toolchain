import { Entity } from '../../../packages/@dcl/ecs/src/engine/entity'
import {
  EntityRemovalRequest,
  EntityRemovalResponse,
  encodeEntityRemovalRequest,
  decodeEntityRemovalRequest,
  encodeEntityRemovalResponse,
  decodeEntityRemovalResponse
} from '../../../packages/@dcl/sdk/src/network/entity-removal-protocol'

describe('when encoding an entity removal request', () => {
  let request: EntityRemovalRequest
  let bytes: Uint8Array

  beforeEach(() => {
    request = { sessionIdHigh: 0xffffffff, sessionIdLow: 2, requestId: 3, networkId: 4, entityId: 5 as Entity }
    bytes = encodeEntityRemovalRequest(request)
  })

  it('should write five little-endian unsigned integers', () => {
    expect(Array.from(bytes)).toEqual([255, 255, 255, 255, 2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0])
  })

  it('should preserve every correlation and entity field', () => {
    expect(decodeEntityRemovalRequest(bytes)).toEqual(request)
  })

  describe('and the bytes occupy a view inside a larger buffer', () => {
    let view: Uint8Array

    beforeEach(() => {
      view = new Uint8Array(30).subarray(5, 25)
      view.set(bytes)
    })

    it('should read the view without reading its surrounding bytes', () => {
      expect(decodeEntityRemovalRequest(view)).toEqual(request)
    })
  })

  describe.each([0, 19, 21])('and the payload length is %i bytes', (length) => {
    beforeEach(() => {
      bytes = new Uint8Array(length)
    })

    it('should reject the malformed request', () => {
      expect(decodeEntityRemovalRequest(bytes)).toBeNull()
    })
  })

  describe.each([-1, 0x100000000, 1.5, Number.NaN])('and a field contains %s', (value) => {
    beforeEach(() => {
      request.requestId = value
    })

    it('should reject a value that cannot be represented on the wire', () => {
      expect(() => encodeEntityRemovalRequest(request)).toThrow(RangeError)
    })
  })
})

describe.each<EntityRemovalResponse['status']>(['accepted', 'rejected'])(
  'when encoding an %s entity removal response',
  (status) => {
    let response: EntityRemovalResponse
    let bytes: Uint8Array

    beforeEach(() => {
      response = { sessionIdHigh: 1, sessionIdLow: 2, requestId: 3, networkId: 4, entityId: 5 as Entity, status }
      bytes = encodeEntityRemovalResponse(response)
    })

    it('should preserve the correlation fields and result', () => {
      expect(decodeEntityRemovalResponse(bytes)).toEqual(response)
    })

    describe('and the status byte is unknown', () => {
      beforeEach(() => {
        bytes[20] = 2
      })

      it('should reject the response', () => {
        expect(decodeEntityRemovalResponse(bytes)).toBeNull()
      })
    })

    describe.each([0, 20, 22])('and the payload length is %i bytes', (length) => {
      beforeEach(() => {
        bytes = new Uint8Array(length)
      })

      it('should reject the malformed response', () => {
        expect(decodeEntityRemovalResponse(bytes)).toBeNull()
      })
    })
  }
)
