import * as path from 'path'
import { FileDescriptorStandardOption, runCommand } from '../utils/shellCommand'

export async function createProtoTypes(definitionsPath: string, output: string, files: string[], protocolPath: string) {
  const protoFiles = files.map((item) => path.resolve(definitionsPath, item)).join(' ')
  await runCommand({
    command: path.resolve(process.cwd(), 'node_modules', '.bin', 'protobuf', 'bin', 'protoc'),
    workingDir: process.cwd(),
    args: [
      '--plugin=./node_modules/.bin/protoc-gen-dcl_ts_proto',
      '--dcl_ts_proto_opt=esModuleInterop=true',
      `--dcl_ts_proto_opt=outputJsonMethods=false`,
      `--dcl_ts_proto_opt=forceLong=false`,
      `--dcl_ts_proto_opt=onlyTypes=true`,
      `--dcl_ts_proto_opt=outputPartialMethods=false`,
      `--dcl_ts_proto_opt=fileSuffix=.gen`,
      `--dcl_ts_proto_out=${output}`,
      `--proto_path=${protocolPath}`,
      protoFiles
    ],
    fdStandards: FileDescriptorStandardOption.ONLY_IF_THROW
  })
}
