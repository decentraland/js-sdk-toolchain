import { IEngine } from '@dcl/ecs'
import { RpcClientModule, RpcServerModule } from '@dcl/rpc/dist/codegen'
import { DataServiceDefinition } from './proto/gen/data-layer.gen'

// minimal file system interface based on Node.js FileSystem API
export type FileSystemInterface = {
  dirname: (path: string) => string
  basename: (filePath: string) => string
  join: (...paths: string[]) => string
  existFile: (filePath: string) => Promise<boolean>
  readFile: (filePath: string) => Promise<Buffer>
  writeFile: (filePath: string, content: Buffer) => Promise<void>
  readdir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean }[]>
  rm: (filePath: string) => Promise<void>
  cwd: () => string
}

export type DataLayerContext = {
  engine: IEngine
  fs: FileSystemInterface
}

export type DataLayerRpcClient = RpcClientModule<DataServiceDefinition, DataLayerContext>
export type DataLayerRpcServer = RpcServerModule<DataServiceDefinition, DataLayerContext>
