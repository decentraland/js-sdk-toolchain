import { CrdtStreamMessage } from '../data-layer/proto/gen/data-layer.gen'

export async function consumeAllMessagesInto(iter: AsyncIterable<CrdtStreamMessage>, cb: (data: Uint8Array) => void) {
  for await (const it of iter) {
    if (it.data.byteLength) {
      cb(it.data)
    }
  }
}
