import { RPC, MessageTransport, Transport } from '@dcl/mini-rpc'
import { Storage } from './types'

export namespace IframeStorage {
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

  export const id = 'IframeStorage'

  export class Client extends RPC<Method, Params, Result> {
    constructor(transport: Transport) {
      super(id, transport)
    }

    readFile(path: string) {
      return this.request('read_file', { path })
    }

    writeFile(path: string, content: Buffer) {
      return this.request('write_file', { path, content })
    }

    exists(path: string) {
      return this.request('exists', { path })
    }

    delete(path: string) {
      return this.request('delete', { path })
    }

    list(path: string) {
      return this.request('list', { path })
    }
  }

  export class Server extends RPC<Method, Params, Result> {
    constructor(transport: Transport) {
      super(id, transport)
    }
  }
}

export function createIframeStorage(origin: string): Storage {
  if (!window.parent) {
    throw new Error('To use this storage the webapp needs to be inside an iframe')
  }

  const transport = new MessageTransport(window, window.parent, origin)
  const client = new IframeStorage.Client(transport)

  return client
}
