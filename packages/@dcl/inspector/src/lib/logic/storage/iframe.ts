import { RPC } from '../rpc'
import { WindowTransport } from '../transports'
import { Storage } from './types'

namespace IframeStorage {
  export type EventType = string

  export type EventData = object

  export enum Method {
    READ_FILE = 'read_file',
    WRITE_FILE = 'write_file',
    EXISTS = 'exists',
    DELETE = 'delete',
    LIST = 'list'
  }

  export type Params = {
    [Method.READ_FILE]: { path: string }
    [Method.WRITE_FILE]: { path: string; content: Buffer }
    [Method.DELETE]: { path: string }
    [Method.EXISTS]: { path: string }
    [Method.LIST]: { path: string }
  }

  export type Result = {
    [Method.READ_FILE]: Buffer
    [Method.WRITE_FILE]: void
    [Method.DELETE]: void
    [Method.EXISTS]: boolean
    [Method.LIST]: { name: string; isDirectory: boolean }[]
  }

  export class Client extends RPC.AbstractRPC<EventType, EventData, Method, Params, Result> {
    // abstract overrideå
    handleRequest: undefined

    // actual client
    readFile(path: string) {
      return this.request(Method.READ_FILE, { path })
    }

    writeFile(path: string, content: Buffer) {
      return this.request(Method.WRITE_FILE, { path, content })
    }

    exists(path: string) {
      return this.request(Method.EXISTS, { path })
    }

    delete(path: string) {
      return this.request(Method.DELETE, { path })
    }

    list(path: string) {
      return this.request(Method.LIST, { path })
    }
  }
}

export function createIframeStorage(): Storage {
  debugger
  if (!window.parent) {
    throw new Error('To use this storage the webapp needs to be inside an iframe')
  }
  const transport = new WindowTransport(window.parent)
  const client = new IframeStorage.Client(transport)

  return client
}

// .......
