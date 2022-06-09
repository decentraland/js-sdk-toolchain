import path from 'path'
import fs from 'fs-extra'
import { FileDescriptorStandardOption, runCommand } from '../utils/shellCommand'
import { Component } from './generateComponent'
import { getFilePathsSync } from '../utils/getFilePathsSync'

export async function generateProtocolBuffer(params: {
  components: Component[]
  definitionsPath: string
  generatedPath: string
  componentPath: string
}) {
  const { definitionsPath, generatedPath, components } = params
  const pbGeneratedPath = path.resolve(generatedPath, 'pb')
  let ret = false

  fs.removeSync(pbGeneratedPath)
  fs.mkdirSync(pbGeneratedPath, { recursive: true })

  const protoFiles = components
    .map((item) => path.resolve(definitionsPath, `${item.componentName}.proto`))
    .join(' ')

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
        `--ts_proto_opt=fileSuffix=.gen`,
        `--ts_proto_out=${pbGeneratedPath}`,
        `--proto_path=${definitionsPath}`,
        protoFiles
      ],
      fdStandards: FileDescriptorStandardOption.ONLY_IF_THROW
    })

    const generatedFiles = getFilePathsSync(pbGeneratedPath, true)
    for (const generatedFile of generatedFiles) {
      removeImportType(path.resolve(pbGeneratedPath, generatedFile))
    }

    ret = true
  } catch (err) {
    console.error(`Couldn't run protoc command properly.`, err)
  }

  return ret
}

export function getComponentId(protoContent: string) {
  const componentIdLine = protoContent
    .split('\n')
    .filter(
      (line) =>
        line.indexOf('ecs_component_id') !== -1 && line.indexOf('option') !== -1
    )
  if (componentIdLine.length > 1) {
    throw Error(
      'There are more than one match with `ecs_component_id` and `option`. Please reserve this keyword to only the definition of ComponentId'
    )
  } else if (componentIdLine.length === 0) {
    throw Error('`ecs_component_id` is missing.')
  }
  return parseInt(componentIdLine[0].split('=')[1])
}

function removeImportType(filePath: string) {
  let content = fs.readFileSync(filePath).toString()
  content = content.replace(/^import type/gm, 'import')
  fs.removeSync(filePath)
  fs.writeFileSync(filePath, content)
}
