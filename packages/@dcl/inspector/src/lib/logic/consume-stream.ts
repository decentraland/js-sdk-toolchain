export async function consumeAllMessagesInto<T>(iter: AsyncIterable<T>, cb: (data: T) => void) {
  for await (const it of iter) {
    cb(it)
  }
}
