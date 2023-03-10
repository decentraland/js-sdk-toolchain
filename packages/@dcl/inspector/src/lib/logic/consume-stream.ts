export async function consumeAllMessagesInto(
  iter: AsyncIterable<Uint8Array>,
  cb: (data: Uint8Array) => void,
  onClose: () => void
) {
  try {
    for await (const it of iter) {
      if (it.byteLength) {
        cb(it)
      }
    }
  } catch (err) {
    debugger
  } finally {
    onClose()
  }
  debugger
}
