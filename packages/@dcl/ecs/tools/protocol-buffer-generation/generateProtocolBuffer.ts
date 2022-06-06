import path from 'path'
import fs from 'fs-extra'
import { FileDescriptorStandardOption, runCommand } from '../utils/shellCommand'

export async function generateProtocolBuffer(params: {
  components: string[]
  definitionsPath: string
  generatedPath: string
  componentPath: string
}) {
  const { definitionsPath, generatedPath } = params
  const pbGeneratedPath = path.resolve(generatedPath, 'pb')

  fs.removeSync(pbGeneratedPath)
  fs.mkdirSync(pbGeneratedPath, { recursive: true })

  try {
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
        `--ts_proto_out=${pbGeneratedPath}`,
        `--proto_path=${definitionsPath}`,
        path.resolve(definitionsPath, '*.proto')
      ],
      fdStandards: FileDescriptorStandardOption.ONLY_IF_THROW
    })
    return true
  } catch (err) {
    console.error(`Couldn't run protoc command.`, err)
    return false
  }
}
