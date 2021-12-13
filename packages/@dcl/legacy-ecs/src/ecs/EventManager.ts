import { error, newId } from './helpers'

const eventNameSymbol = '__event_name__'

/**
 * @public
 */
export interface IEventConstructor<T> {
  // @internal
  [eventNameSymbol]?: string
  new (...args: any[]): T
}

const takenEventNames: string[] = []

function getEventNameFromConstructor<T>(ctor: IEventConstructor<T>): string {
  if (!(eventNameSymbol in ctor) || typeof ctor[eventNameSymbol] !== 'string') {
    throw new Error('The EventConstructor is not registered')
  }
  return ctor[eventNameSymbol] as any as string
}

type EventListener<X> = {
  listener: X
  fn: (this: X, event: any) => void
}

/**
 * @public
 */
export class EventManager {
  private listeners: Record<string, Array<EventListener<any>>> = {}

  addListener<T, X>(
    eventClass: IEventConstructor<T>,
    listener: X,
    listenerFunction: (this: X, event: T) => void
  ) {
    if (!eventClass || typeof (eventClass as any) !== 'function') {
      throw new Error('Invalid EventConstructor')
    }
    const eventName = getEventNameFromConstructor(eventClass)

    let listeners = this.listeners[eventName]

    if (!listeners) {
      listeners = this.listeners[eventName] = []
    }

    for (let i = 0; i < listeners.length; i++) {
      const x = listeners[i]
      if (x.listener === listener) {
        throw new Error('The provided listener is already registered')
      }
    }

    listeners.push({
      listener,
      fn: listenerFunction
    })

    return this
  }

  removeListener<X>(listener: X, eventClass: IEventConstructor<any>): boolean {
    if (!eventClass || typeof (eventClass as any) !== 'function') {
      throw new Error('Invalid EventConstructor')
    }

    const eventName = getEventNameFromConstructor(eventClass)

    const listeners = this.listeners[eventName]

    if (!listeners) {
      return false
    }

    for (let i = 0; i < listeners.length; i++) {
      const x = listeners[i]
      if (x.listener === listener) {
        listeners.splice(i, 1)
        return true
      }
    }

    return false
  }

  fireEvent<T extends object>(event: T) {
    const eventName = getEventNameFromConstructor((event as any).constructor)

    const listeners = this.listeners[eventName]

    if (listeners) {
      for (let i = 0; i < listeners.length; i++) {
        try {
          const l = listeners[i]
          l.fn.call(l.listener, event)
        } catch (e) {
          // TODO: e may not be an instance of Error
          error(e as any)
        }
      }
    }

    return this
  }
}

/**
 * @public
 */
export function EventConstructor(): ClassDecorator {
  const eventName = newId('EV')

  if (takenEventNames.indexOf(eventName) !== -1) {
    throw new Error(`The event name ${eventName} is already taken`)
  }

  takenEventNames.push(eventName)

  // eslint-disable-next-line @typescript-eslint/ban-types
  return <TFunction extends Function>(target: TFunction): TFunction | void => {
    ;(target as any)[eventNameSymbol] = eventName
    return target
  }
}
