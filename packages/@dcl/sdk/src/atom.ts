import future, { IFuture } from './future'

// atom value wrapper like in clojure

// Simple Observable implementation to replace Babylon.js dependency
class SimpleObservable<T> {
  private observers: ((value: T) => void)[] = []
  private onceObservers: ((value: T) => void)[] = []

  add(callback: (value: T) => void): (value: T) => void {
    this.observers.push(callback)
    return callback
  }

  addOnce(callback: (value: T) => void): void {
    this.onceObservers.push(callback)
  }

  remove(callback: (value: T) => void): void {
    const index = this.observers.indexOf(callback)
    if (index > -1) {
      this.observers.splice(index, 1)
    }
  }

  notifyObservers(value: T): void {
    this.observers.forEach((observer) => observer(value))

    if (this.onceObservers.length > 0) {
      this.onceObservers.forEach((observer) => observer(value))
      this.onceObservers.length = 0
    }
  }
}

const EMPTY = Symbol('empty')
type EMPTY = typeof EMPTY

export type Atom<T> = {
  deref(): Promise<T>
  getOrNull(): T | null
  observable: SimpleObservable<T>
  swap(value: T): T | void
  pipe(fn: (value: T) => void | Promise<void>): Promise<void>
}

export function Atom<T>(initialValue: T | EMPTY = EMPTY): Atom<T> {
  const observable = new SimpleObservable<T>()
  let value: T | EMPTY = initialValue
  const valueFutures: IFuture<T>[] = []

  observable.addOnce((value) => {
    valueFutures.forEach(($) => $.resolve(value))
    valueFutures.length = 0
  })

  return {
    async pipe(fn) {
      observable.add(async (t) => {
        try {
          await fn(t)
        } catch (err) {
          console.error(err)
        }
      })
      if (value !== EMPTY) {
        try {
          await fn(value)
        } catch (err) {
          console.error(err)
        }
      }
    },
    deref() {
      if (value === EMPTY) {
        const ret = future<T>()
        valueFutures.push(ret)
        return ret
      }
      return Promise.resolve(value)
    },
    getOrNull() {
      if (value === EMPTY) {
        return null
      }
      return value
    },
    observable,
    swap(newValue) {
      const oldValue = value
      if (newValue !== value) {
        value = newValue
        observable.notifyObservers(value)
      }
      return oldValue === EMPTY ? undefined : oldValue
    }
  }
}
