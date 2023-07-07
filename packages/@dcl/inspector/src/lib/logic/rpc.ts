import mitt from 'mitt'
import future, { IFuture } from 'fp-future'

/**
 * An abstract class to implement RPC server/client or simple event emitters over a transport
 */

export namespace RPC {
  export interface Transport {
    send: (message: any) => void
    handler?: (message: any) => void
  }

  export type Message<T extends string, K extends Record<T, any>> = {
    type: T
    payload: K[T]
  }

  enum MessageType {
    EVENT = 'event',
    REQUEST = 'request',
    RESPONSE = 'response'
  }

  type MessagePayload<
    EventType extends string,
    EventData extends Record<EventType, any>,
    Method extends string,
    Params extends Record<Method, any>,
    Result extends Record<Method, any>
  > = {
    [MessageType.EVENT]: Event<EventType, EventData>
    [MessageType.REQUEST]: Request<Method, Params>
    [MessageType.RESPONSE]: Response<Method, Result>
  }

  type Event<T extends string, K extends Record<T, any>> = {
    type: T
    data: K[T]
  }

  type Request<T extends string, K extends Record<T, any>> = {
    id: number
    method: T
    params: K[T]
  }

  type Response<Method extends string, Result extends Record<Method, any>> = {
    id: number
    method: Method
  } & (
    | {
        success: true
        result: Result[Method]
      }
    | { success: false; error: string }
  )

  export abstract class AbstractRPC<
    EventType extends string = string,
    EventData extends Record<EventType, any> = Record<EventType, any>,
    Method extends string = string,
    Params extends Record<Method, any> = Record<Method, any>,
    Result extends Record<Method, any> = Record<Method, any>
  > {
    private currentId = 0
    private promises = new Map<number, IFuture<any>>()
    private events = mitt<EventData>()

    // this is used during the dispose()
    private isDisposed = false
    private previousHandler = this.transport.handler

    constructor(public transport: Transport) {
      this.transport.handler = async (message) => {
        if (this.isMessage(message)) {
          switch (message.type) {
            case MessageType.EVENT: {
              if (this.isEvent(message.payload)) {
                const event = message.payload
                this.events.emit(event.type, event.data)
              }
              break
            }
            case MessageType.REQUEST: {
              if (this.isRequest(message.payload) && this.handleRequest) {
                const request = message.payload
                try {
                  const result = await this.handleRequest(request)
                  this.transport.send({
                    type: MessageType.RESPONSE,
                    payload: {
                      id: request.id,
                      method: request.method,
                      success: true,
                      result
                    }
                  })
                } catch (error) {
                  this.transport.send({
                    type: MessageType.RESPONSE,
                    payload: {
                      id: request.id,
                      method: request.method,
                      success: false,
                      error: (error as Error).message
                    }
                  })
                }
              }
              break
            }
            case MessageType.RESPONSE: {
              if (this.isResponse(message.payload)) {
                const response = message.payload
                if (this.promises.has(response.id)) {
                  const promise = this.promises.get(response.id)!
                  if (response.success) {
                    promise.resolve(response.result)
                  } else {
                    promise.reject(new Error(response.error))
                  }
                }
              }
              break
            }
          }
        }
      }
    }

    abstract handleRequest?<T extends Method>(req: Request<T, Params>): Promise<Result[T]>

    private isMessage(
      value: any
    ): value is Message<MessageType, MessagePayload<EventType, EventData, Method, Params, Result>> {
      const messageTypes = Object.values(MessageType).filter((value) => typeof value === 'string')
      return (
        value &&
        typeof value.type === 'string' &&
        messageTypes.includes(value.type) &&
        typeof value.payload === 'object' &&
        typeof value.payload !== null
      )
    }

    private isEvent(value: any): value is Event<EventType, EventData> {
      return value && typeof value.type === 'string'
    }

    private isRequest(value: any): value is Request<Method, Params> {
      return value && typeof value.method === 'string' && typeof value.id === 'number'
    }

    private isResponse(value: any): value is Response<Method, Result> {
      return value && typeof value.method === 'string' && typeof value.id === 'number'
    }

    on<T extends EventType>(type: T, handler: (data: EventData[T]) => void) {
      this.events.on(type, handler)
    }

    off<T extends EventType>(type: T, handler: (data: EventData[T]) => void) {
      this.events.off(type, handler)
    }

    emit<T extends EventType>(type: T, data: EventData[T]) {
      this.transport.send({
        type: MessageType.EVENT,
        payload: {
          type,
          data
        }
      })
    }

    async request<T extends Method>(method: T, params: Params[T]) {
      const promise = future<Result[T]>()
      const id = this.currentId++
      this.promises.set(id, promise)
      this.transport.send({
        type: MessageType.REQUEST,
        payload: {
          id,
          method,
          params
        }
      })
      return promise
    }

    dispose() {
      if (!this.isDisposed) {
        this.isDisposed = true
        this.transport.handler = this.previousHandler!
      }
    }
  }
}
