import { copyFileSync, mkdirSync, readFileSync, removeSync, rmSync, writeFileSync } from 'fs-extra'
import * as path from 'path'
import { TSC } from '../common'
import { runCommand } from '../helpers'
import { getFilePathsSync } from '../utils/getFilePathsSync'
import { snakeToPascal } from '../utils/snakeToPascal'
import { getBlock, getCommentBeforeAt, parseFileLines } from '../utils/stringParser'

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
      comment?: string
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

const NON_EXPOSED_LIST_NAMES: string[] = [
  'SocialController',
  'DevTools',
  'Permissions',
  'DevTools',
  'Permissions',
  'ParcelIdentity'
]

async function internalCompile() {
  const outModulesPath = path.resolve(__dirname, 'src', 'modules')
  const apiArray = await preprocessProtoGeneration(
    path.resolve(__dirname, 'src', 'proto', 'decentraland', 'kernel', 'apis')
  )

  removeSync(outModulesPath)
  mkdirSync(outModulesPath)

  let apisDTsContent = ''
  for (const api of apiArray) {
    if (NON_EXPOSED_LIST_NAMES.includes(api.name)) continue
    const types: Set<string> = new Set()
    const functions: string[] = []
    for (const [methodName, method] of Object.entries(api.def.methods)) {
      types.add(method.requestType)
      types.add(method.responseType)

      if (method.comment) {
        functions.push(method.comment)
      }
      functions.push(
        `export declare function ${method.requestStream ? '*' : ''}${methodName}(body: ${
          method.requestType
        }): Promise<${method.responseType}>\n`
      )
    }

    const apiModuleDirPath = path.resolve(outModulesPath, api.name)
    mkdirSync(path.resolve(apiModuleDirPath))

    let indexContent = ''
    indexContent += `import type {${Array.from(types).join(', ')}} from './../../proto/decentraland/kernel/apis/${
      api.fileName
    }.gen'\n`
    indexContent += functions.join('\n')

    writeFileSync(path.resolve(apiModuleDirPath, `index.gen.ts`), indexContent)
    copyFileSync(
      path.resolve(__dirname, 'src', 'tsconfig.module.json'),
      path.resolve(apiModuleDirPath, 'tsconfig.json')
    )

    await runCommand(`${TSC} -p tsconfig.json`, path.resolve(apiModuleDirPath))

    rmSync(path.resolve(apiModuleDirPath, 'tsconfig.json'))
    rmSync(path.resolve(apiModuleDirPath, 'index.gen.ts'))

    const moduleDTsPath = path.resolve(apiModuleDirPath, 'index.d.ts')
    processDeclarations(api.name, moduleDTsPath)

    if (api.blockComments) {
      apisDTsContent += api.blockComments
    } else {
      apisDTsContent += `
/**
  * ${api.name}
  */
`
    }
    apisDTsContent += readFileSync(moduleDTsPath).toString()

    rmSync(apiModuleDirPath, { recursive: true, force: true })
  }

  writeFileSync(path.resolve(outModulesPath, 'index.d.ts'), apisDTsContent)
}

async function preprocessProtoGeneration(protoPath: string) {
  const apiFiles = getFilePathsSync(protoPath, false)
    .filter((filePath) => filePath.toLowerCase().endsWith('.gen.ts'))
    .map((item) => item.replace('.gen.ts', ''))

  const apis = []
  for (const fileName of apiFiles) {
    const filePath = path.resolve(protoPath, `${fileName}.gen.ts`)
    const typesTextContent = readFileSync(filePath).toString()

    const textContent = typesTextContent
      .replace(/requestType: *([a-zA-Z]+)/g, `requestType: '$1'`)
      .replace(/responseType: *([a-zA-Z]+)/g, `responseType: '$1'`)
      .replace(`export const protobufPackage = `, '// protobufPackage = ')

    writeFileSync(filePath, textContent)
    const content = await import(filePath)

    const item = snakeToPascal(fileName)

    const defBlock = getBlock(textContent, textContent.indexOf(`export const ${item}ServiceDefinition`))
    const fileLines = parseFileLines(textContent)
    const blockComments = getCommentBeforeAt(fileLines, textContent.indexOf(`export const ${item}ServiceDefinition`))

    const cleanContent = textContent
      .replace(`export type ${item}ServiceDefinition`, '//')
      .replace(`export const ${item}ServiceDefinition`, '//')
      .replace(defBlock, '')
      .replace(`// = typeof ${item}ServiceDefinition`, '')
      .replace(`// = {} as const`, '')

    writeFileSync(filePath, cleanContent)

    const def = content[`${item}ServiceDefinition`] as ProtoServiceDefinition

    for (const methodName in def.methods) {
      const methodComments = getCommentBeforeAt(fileLines, textContent.indexOf(`${methodName}: {`))
      if (methodComments) {
        def.methods[methodName].comment = methodComments
      }
    }

    apis.push({
      name: item,
      def,
      content,
      fileName,
      blockComments
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
      const block = getBlock(decFile, where).replace(/export const protobufPackage (.*)\n/, '')
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

  const content = blocks.join('\n\t// Function declaration section').replace(/import(.*)\n/g, '')
  writeFileSync(filePath, `declare module "~system/${apiName}" {\n${content}\n}`)
}
