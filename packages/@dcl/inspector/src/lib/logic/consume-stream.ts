import { StreamReqRes } from '../data-layer/todo-protobuf'

export async function consumeAllMessagesInto(
  iter: AsyncIterable<StreamReqRes>,
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
