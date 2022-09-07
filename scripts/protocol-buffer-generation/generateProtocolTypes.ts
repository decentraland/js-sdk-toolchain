import * as path from 'path'
import { FileDescriptorStandardOption, runCommand } from '../utils/shellCommand'

export async function createProtoTypes(
  definitionsPath: string,
  output: string,
  files: string[]
) {
  const protoFiles = files
    .map((item) => path.resolve(definitionsPath, item))
    .join(' ')

  await runCommand({
    command: path.resolve(
      process.cwd(),
      'node_modules',
      '.bin',
      'protobuf',
      'bin',
      'protoc'
    ),
    workingDir: process.cwd(),
    args: [
      '--plugin=./node_modules/.bin/protoc-gen-ts_proto',
      '--ts_proto_opt=esModuleInterop=true',
      `--ts_proto_opt=outputJsonMethods=false`,
      `--ts_proto_opt=forceLong=false`,
      `--ts_proto_opt=onlyTypes=true`,
      `--ts_proto_opt=outputPartialMethods=false`,
      `--ts_proto_opt=fileSuffix=.gen`,
      `--ts_proto_out=${output}`,
      `--proto_path=${definitionsPath}`,
      protoFiles
    ],
    fdStandards: FileDescriptorStandardOption.ONLY_IF_THROW
  })
}
