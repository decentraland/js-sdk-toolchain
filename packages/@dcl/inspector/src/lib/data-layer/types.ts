import { IEngine } from '@dcl/ecs'
import { RpcClientModule, RpcServerModule } from '@dcl/rpc/dist/codegen'
import { DataServiceDefinition } from './proto/gen/data-layer.gen'

// minimal file system interface based on Node.js FileSystem API
export type FileSystemInterface = {
  existFile: (filePath: string) => Promise<boolean>
  readFile: (filePath: string) => Promise<Buffer>
  writeFile: (filePath: string, content: Buffer) => Promise<void>
  readdir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean }[]>
  rm: (filePath: string) => Promise<void>
}

export type DataLayerContext = {
  engine: IEngine
  fs: FileSystemInterface
}

export type DataLayerRpcClient = RpcClientModule<DataServiceDefinition, DataLayerContext>
export type DataLayerRpcServer = RpcServerModule<DataServiceDefinition, DataLayerContext>
