import * as path from 'path'
import * as fs from 'fs-extra'
import { FileDescriptorStandardOption, runCommand } from '../utils/shellCommand'
import { Component } from './generateComponent'
import { getFilePathsSync } from '../utils/getFilePathsSync'
import { PROTO_COMPILER_PATH, TS_PROTO_PLUGIN_PATH } from './protoConst'

export async function generateProtocolBuffer(params: {
  components: Component[]
  definitionsPath: string
  generatedPath: string
  componentPath: string
  protocolPath: string
}) {
  const { definitionsPath, generatedPath, components, protocolPath } = params
  const pbGeneratedPath = path.resolve(generatedPath, 'pb')
  let ret = false

  fs.removeSync(pbGeneratedPath)
  fs.mkdirSync(pbGeneratedPath, { recursive: true })

  const protoFiles = components.map((item) => path.resolve(definitionsPath, `${item.componentFile}.proto`)).join(' ')

  const protoCommandArgs: string[] = [
    `--plugin=${TS_PROTO_PLUGIN_PATH}`,
    `--dcl_ts_proto_opt=esModuleInterop=true`,
    `--dcl_ts_proto_opt=outputJsonMethods=false`,
    `--dcl_ts_proto_opt=forceLong=false`,
    `--dcl_ts_proto_opt=outputPartialMethods=false`,
    `--dcl_ts_proto_opt=fileSuffix=.gen`,
    `--dcl_ts_proto_opt=unrecognizedEnum=false`,
    `--dcl_ts_proto_opt=oneof=unions`,
    `--dcl_ts_proto_out=${pbGeneratedPath}`,
    `--proto_path=${protocolPath}`,
    protoFiles
  ]
  const commandWorkingDir = process.cwd()
  process.stderr.write(`Command is ${PROTO_COMPILER_PATH} \\ ${protoCommandArgs.join('\\\n  ')}\n`)

  try {
    await runCommand({
      command: PROTO_COMPILER_PATH,
      workingDir: commandWorkingDir,
      args: protoCommandArgs,
      fdStandards: FileDescriptorStandardOption.ONLY_IF_THROW
    })

    const generatedFiles = getFilePathsSync(pbGeneratedPath, true)
    for (const generatedFile of generatedFiles) {
      fixTsGeneratedByProto(path.resolve(pbGeneratedPath, generatedFile))
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
    .filter((line) => line.indexOf('ecs_component_id') !== -1 && line.indexOf('option') !== -1)
  if (componentIdLine.length > 1) {
    throw Error(
      'There are more than one match with `ecs_component_id` and `option`. Please reserve this keyword to only the definition of ComponentId'
    )
  } else if (componentIdLine.length === 0) {
    throw Error('`ecs_component_id` is missing.')
  }
  return parseInt(componentIdLine[0].split('=')[1])
}

export function fixTsGeneratedByProto(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8')

  /**
   * Remove the `import type` and replace with just `import`
   * The `tsc` compile won't fail
   */
  content = content.replace(/^import type/gm, 'import')

  /**
   * Read the generated pb component and add @internal comments to exported methods
   * So we dont add this types to the final .d.ts build
   */
  content = content.replace(`export const protobufPackage = `, 'const protobufPackageSarasa = ')
  content = content.replace(/\nexport /g, publicInterface)
  content = content.replace(/export const/g, internalComment)

  /**
   * Convert all `enum` to `const enum`
   */
  content = content.replace(/export enum/g, 'export const enum')

  fs.removeSync(filePath)
  fs.writeFileSync(filePath, content)
}

const internalComment = `
/**
 * @internal
 */
export const`

const publicInterface = `
/**
 * @public
 */
export `
