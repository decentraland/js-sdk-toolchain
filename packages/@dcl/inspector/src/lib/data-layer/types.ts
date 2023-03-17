import { IEngine } from '@dcl/ecs'
import { RpcClientModule } from '@dcl/rpc/dist/codegen'
import { DataServiceDefinition } from './proto/gen/data-layer.gen'

export type SupportedFormat =
  | {
      type: 'string'
      format: string
    }
  | {
      type: 'uint8array'
      format: Uint8Array
    }

export type FileSystemInterface = {
  existFile: (filePath: string) => Promise<boolean>
  readFile: <T = string | Uint8Array>(filePath: string, format: 'string' | 'uint8array') => Promise<T>

  writeFile: (filePath: string, content: Uint8Array | string) => Promise<void>

  getDirectoryFiles: (dirPath: string) => Promise<string[]>
}

export type DataLayerContext = {
  engine: IEngine
  fs: FileSystemInterface
}

export type DataLayerRpcClient = RpcClientModule<DataServiceDefinition, DataLayerContext>
