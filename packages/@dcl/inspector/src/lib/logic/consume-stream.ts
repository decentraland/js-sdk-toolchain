import { StreamMessage } from '../data-layer/types'

export async function consumeAllMessagesInto(
  iter: AsyncIterable<StreamMessage>,
  cb: (data: Uint8Array) => void,
  onClose: () => void
) {
  try {
    for await (const it of iter) {
      if (it.data.byteLength) {
        cb(it.data)
      }
    }
  } catch (err) {
    debugger
  } finally {
    onClose()
  }
  debugger
}
