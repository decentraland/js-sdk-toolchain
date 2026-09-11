import type { Entity } from '@dcl/ecs'

export type EntityRemovalRequest = {
  sessionIdHigh: number
  sessionIdLow: number
  requestId: number
  networkId: number
  entityId: Entity
}

export type EntityRemovalResponse = EntityRemovalRequest & {
  status: 'accepted' | 'rejected'
}

const REQUEST_LENGTH = 20
const RESPONSE_LENGTH = REQUEST_LENGTH + 1

export function encodeEntityRemovalRequest(request: EntityRemovalRequest): Uint8Array {
  const values = [request.sessionIdHigh, request.sessionIdLow, request.requestId, request.networkId, request.entityId]
  const bytes = new Uint8Array(REQUEST_LENGTH)
  const view = new DataView(bytes.buffer)
  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
      throw new RangeError('Entity removal request fields must be unsigned 32-bit integers')
    }
    view.setUint32(index * 4, value, true)
  }
  return bytes
}

export function decodeEntityRemovalRequest(bytes: Uint8Array): EntityRemovalRequest | null {
  if (bytes.byteLength !== REQUEST_LENGTH) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return {
    sessionIdHigh: view.getUint32(0, true),
    sessionIdLow: view.getUint32(4, true),
    requestId: view.getUint32(8, true),
    networkId: view.getUint32(12, true),
    entityId: view.getUint32(16, true) as Entity
  }
}

export function encodeEntityRemovalResponse(response: EntityRemovalResponse): Uint8Array {
  const bytes = new Uint8Array(RESPONSE_LENGTH)
  bytes.set(encodeEntityRemovalRequest(response))
  bytes[REQUEST_LENGTH] = response.status === 'accepted' ? 0 : 1
  return bytes
}

export function decodeEntityRemovalResponse(bytes: Uint8Array): EntityRemovalResponse | null {
  if (bytes.byteLength !== RESPONSE_LENGTH || bytes[REQUEST_LENGTH] > 1) return null
  const request = decodeEntityRemovalRequest(bytes.subarray(0, REQUEST_LENGTH))
  if (!request) return null
  return { ...request, status: bytes[REQUEST_LENGTH] === 0 ? 'accepted' : 'rejected' }
}
