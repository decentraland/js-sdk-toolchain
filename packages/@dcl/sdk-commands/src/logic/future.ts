export type IFuture<T> = Promise<T> & {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (error: Error) => void
}

export function future<T = void>(): IFuture<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>()
  return Object.assign(promise, { resolve, reject })
}

export default future
