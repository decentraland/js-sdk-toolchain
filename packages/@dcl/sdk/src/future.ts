export type IFuture<T> = Promise<T> & {
  resolve: (x: T) => void;
  reject: (x: Error) => void;
  finally: (fn: () => void) => void;
  isPending: boolean;
};

export function future<T = any>(): IFuture<T> {
  let resolver: (x: T) => void;
  let rejecter: (x: Error) => void;

  const promise: any = new Promise((ok, err) => {
    resolver = (x: T) => {
      ok(x);
      promise.isPending = false;
    };
    rejecter = (x: Error) => {
      err(x);
      promise.isPending = false;
    };
  }).catch(e => Promise.reject(e));

  promise.resolve = resolver!;
  promise.reject = rejecter!;

  if (!("finally" in promise)) {
    promise.finally = (fn: any) => {
      promise.then(fn);
      promise.catch(fn);
    };
  }

  promise.isPending = true;

  return promise as IFuture<T>;
}

export default future;