import { Result } from 'arg'
import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'

export const args = declareArgs({
  '--help': Boolean,
  '-h': '--help',
  '--dir': String,
  '--target': String,
  '-t': '--target',
  '--port': Number,
  '-p': '--port',
  '--https': Boolean,
  '--no-browser': Boolean,
  '-b': '--no-browser',
  '--value': String,
  '-v': '--value',
  '--address': String,
  '-a': '--address',
  '--confirm': Boolean,
  '-c': '--confirm'
})

export interface Options {
  args: Result<typeof args>
  components: CliComponents
}

export interface StorageInfo {
  key?: string
  value?: string
  address?: string
  world?: string
  action: 'get' | 'set' | 'delete' | 'clear'
  targetUrl: string
  rootCID: string
  timestamp: string
  metadata: string
  baseParcel: string
  parcels: string[]
  skipValidations: boolean
  debug: boolean
  isWorld: boolean
}

export interface LinkerOptions {
  linkerPort?: number
  openBrowser: boolean
  isHttps: boolean
}

export interface AuthHeaders {
  [key: string]: string
}

export interface ApiResponse {
  ok: boolean
  status: number
  text: () => Promise<string>
  json: () => Promise<any>
}
