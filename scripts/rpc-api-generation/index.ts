import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  removeSync,
  rmSync,
  writeFileSync
} from 'fs-extra'
import * as path from 'path'
import { TSC } from '../common'
import { runCommand } from '../helpers'
import { getFilePathsSync } from '../utils/getFilePathsSync'
import { getBlock } from '../utils/stringParser'

type ProtoServiceDefinition = {
  name: string
  fullName: string
  methods: Record<
    string,
    {
      name: string
      requestType: string
      requestStream: boolean
      responseType: string
      responseStream: boolean
      options: any
    }
  >
}

export async function compileProtoApi() {
  try {
    await internalCompile()
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function internalCompile() {
  const outModulesPath = path.resolve(__dirname, 'src', 'modules')
  const apiArray = await preprocessProtoGeneration(
    path.resolve(__dirname, 'src', 'proto')
  )

  removeSync(outModulesPath)
  mkdirSync(outModulesPath)

  for (const api of apiArray) {
    const types: Set<string> = new Set()
    const functions: string[] = []
    for (const [methodName, method] of Object.entries(api.def.methods)) {
      types.add(method.requestType)
      types.add(method.responseType)
      functions.push(
        `export declare function ${
          method.requestStream ? '*' : ''
        }${methodName}(body: ${method.requestType}): Promise<${
          method.responseType
        }>`
      )
    }

    const apiModuleDirPath = path.resolve(outModulesPath, api.name)
    mkdirSync(path.resolve(apiModuleDirPath))

    let indexContent = ''
    indexContent += `import type {${Array.from(types).join(
      ', '
    )}} from './../../proto/${api.name}.gen'\n`
    indexContent += functions.join('\n')

    writeFileSync(path.resolve(apiModuleDirPath, `index.gen.ts`), indexContent)
    copyFileSync(
      path.resolve(__dirname, 'src', 'tsconfig.module.json'),
      path.resolve(apiModuleDirPath, 'tsconfig.json')
    )

    await runCommand(`${TSC} -p tsconfig.json`, path.resolve(apiModuleDirPath))

    rmSync(path.resolve(apiModuleDirPath, 'tsconfig.json'))
    rmSync(path.resolve(apiModuleDirPath, 'index.gen.ts'))

    processDeclarations(api.name, path.resolve(apiModuleDirPath, 'index.d.ts'))
  }
}

async function preprocessProtoGeneration(protoPath: string) {
  const apiFiles = getFilePathsSync(protoPath, false)
    .filter((filePath) => filePath.toLowerCase().endsWith('.gen.ts'))
    .map((item) => item.replace('.gen.ts', ''))

  const apis = []
  for (const item of apiFiles) {
    const filePath = path.resolve(__dirname, `./src/proto/${item}.gen.ts`)
    const typesTextContent = readFileSync(filePath).toString()

    const textContent = typesTextContent
      .replace(/requestType: *([a-zA-Z]+)/g, `requestType: '$1'`)
      .replace(/responseType: *([a-zA-Z]+)/g, `responseType: '$1'`)
      .replace(`export const protobufPackage = ''`, '')

    writeFileSync(filePath, textContent)
    const content = await import(filePath)

    const defBlock = getBlock(
      textContent,
      textContent.indexOf(`export const ${item}ServiceDefinition`)
    )

    const cleanContent = textContent
      .replace(`export type ${item}ServiceDefinition`, '//')
      .replace(`export const ${item}ServiceDefinition`, '//')
      .replace(defBlock, '')
      .replace(`// = typeof ${item}ServiceDefinition`, '')
      .replace(`// = {} as const`, '')

    writeFileSync(filePath, cleanContent)

    apis.push({
      name: item,
      def: content[`${item}ServiceDefinition`] as ProtoServiceDefinition,
      content
    })
  }
  return apis
}

function processDeclarations(apiName: string, filePath: string) {
  const decFile = readFileSync(filePath).toString()

  const blocks: string[] = []
  let where = 0
  do {
    where = decFile.indexOf('declare module', where)
    if (where !== -1) {
      const block = getBlock(decFile, where).replace(
        `export const protobufPackage = "";`,
        ''
      )
      if (block.length > 0) {
        blocks.push(block)
      } else {
        throw new Error('bad block')
      }
    } else {
      break
    }
    where += 'declare module'.length
  } while (where)

  const content = blocks
    .join('\n// ########### BLOCK \n')
    .replace(/import /g, '// import')
  writeFileSync(
    filePath,
    `declare module "~system/${apiName}" {\n${content}\n}`
  )
}
