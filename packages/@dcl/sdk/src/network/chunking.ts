import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { readMessages } from './server/utils'

/**
 * Chunks CRDT messages from a Uint8Array buffer, respecting message boundaries
 * Uses the comprehensive readMessages function that handles all message types
 */
export function chunkCrdtMessages(data: Uint8Array, maxSizeKB: number = 12): Uint8Array[] {
  if (data.length === 0) {
    return []
  }

  const networkBuffer = new ReadWriteByteBuffer()
  const chunks: Uint8Array[] = []

  for (const message of readMessages(data)) {
    // Check if adding this message would exceed the size limit
    const currentBufferSize = networkBuffer.toBinary().byteLength
    const messageSize = message.messageBuffer.byteLength

    if ((currentBufferSize + messageSize) / 1024 > maxSizeKB) {
      // If the current buffer has content, save it as a chunk
      if (currentBufferSize > 0) {
        chunks.push(networkBuffer.toCopiedBinary())
        networkBuffer.resetBuffer()
      }

      // If the message itself is larger than the limit, skip it
      if (messageSize / 1024 > maxSizeKB) {
        console.error(`Message too large (${messageSize} bytes), skipping CRDT message`)
        continue
      }
    }

    // Add message to current buffer
    networkBuffer.writeBuffer(message.messageBuffer, false)
  }

  // Add any remaining data as the final chunk
  if (networkBuffer.currentWriteOffset() > 0) {
    chunks.push(networkBuffer.toBinary())
  }

  return chunks
}
