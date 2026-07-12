/// --- FETCH ---
/// <reference path="./apis.d.ts" />
/// <reference path="./sdk.d.ts" />

type RequestRedirect = 'follow' | 'error' | 'manual'
type ResponseType = 'basic' | 'cors' | 'default' | 'error' | 'opaque' | 'opaqueredirect'

interface RequestInit {
  // whatwg/fetch standard options
  body?: string
  headers?: { [index: string]: string }
  method?: string
  redirect?: RequestRedirect

  // custom DCL property
  timeout?: number
}

interface ReadOnlyHeaders {
  get(name: string): string | null
  has(name: string): boolean
  forEach(callbackfn: (value: string, key: string, parent: ReadOnlyHeaders) => void, thisArg?: any): void
}

interface Response {
  readonly headers: ReadOnlyHeaders
  readonly ok: boolean
  readonly redirected: boolean
  readonly status: number
  readonly statusText: string
  readonly type: ResponseType
  readonly url: string

  json(): Promise<any>
  text(): Promise<string>
}

declare function fetch(url: string, init?: RequestInit): Promise<Response>

/// --- WebSocket ---

interface Event {
  readonly type: string
}

interface MessageEvent extends Event {
  /**
   * Returns the data of the message.
   */
  readonly data: any
}

interface CloseEvent extends Event {
  readonly code: number
  readonly reason: string
  readonly wasClean: boolean
}

interface WebSocket {
  readonly bufferedAmount: number
  readonly extensions: string
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null
  onerror: ((this: WebSocket, ev: Event) => any) | null
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null
  onopen: ((this: WebSocket, ev: Event) => any) | null
  readonly protocol: string
  readonly readyState: number
  readonly url: string
  close(code?: number, reason?: string): void
  send(data: string): void
  readonly CLOSED: number
  readonly CLOSING: number
  readonly CONNECTING: number
  readonly OPEN: number
}

declare var WebSocket: {
  prototype: WebSocket
  new (url: string, protocols?: string | string[]): WebSocket
  readonly CLOSED: number
  readonly CLOSING: number
  readonly CONNECTING: number
  readonly OPEN: number
}

declare var console: {
  log(message?: any, ...optionalParams: any[]): void
  error(message?: any, ...optionalParams: any[]): void
}

/// --- Timers ---
declare function setTimeout(callback: () => void, ms: number): number
declare function clearTimeout(timerId: number): void
declare function setInterval(callback: () => void, ms: number): number
declare function clearInterval(timerId: number): void

/// --- Text encoding ---
/// utf-8 support is guaranteed; behavior for any other encoding label is
/// unspecified (implementations may throw RangeError).

interface TextEncoder {
  readonly encoding: string
  encode(input?: string): Uint8Array
  encodeInto(source: string, destination: Uint8Array): { read: number; written: number }
}

declare var TextEncoder: {
  prototype: TextEncoder
  new (): TextEncoder
}

interface TextDecoder {
  readonly encoding: string
  readonly fatal: boolean
  readonly ignoreBOM: boolean
  decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string
}

declare var TextDecoder: {
  prototype: TextDecoder
  new (label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }): TextDecoder
}

declare const DEBUG: boolean
