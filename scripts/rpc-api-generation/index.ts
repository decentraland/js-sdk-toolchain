import { copyFileSync, mkdirSync, readdirSync, readFileSync, removeSync, rmSync, writeFileSync } from 'fs-extra'
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

const COMPONENTS_PROTO_PATH = path.resolve(
  __dirname,
  '../../node_modules/@dcl/protocol/proto/decentraland/sdk/components'
)

// The ecs codegen only compiles (and @dcl/ecs only exports) the common protos that some
// component proto imports. A common proto used exclusively by kernel APIs has no @dcl/ecs
// counterpart, so its declarations must stay embedded in apis.d.ts.
function isExportedByEcs(commonModuleName: string): boolean {
  const protoImport = `import "decentraland/sdk/components/${commonModuleName
    .replace(/^.*decentraland\/sdk\/components\//, '')
    .replace(/\.gen$/, '.proto')}"`
  return readdirSync(COMPONENTS_PROTO_PATH)
    .filter((file) => file.endsWith('.proto'))
    .some((file) => readFileSync(path.resolve(COMPONENTS_PROTO_PATH, file)).toString().includes(protoImport))
}

function processDeclarations(apiName: string, filePath: string) {
  const decFile = readFileSync(filePath).toString()

  const blocks: string[] = []
  const typesFromEcs: Set<string> = new Set()
  let where = 0
  do {
    where = decFile.indexOf('declare module', where)
    if (where !== -1) {
      const moduleName = decFile.slice(where).match(/^declare module "([^"]+)"/)?.[1] ?? ''
      const block = getBlock(decFile, where).replace(/export const protobufPackage (.*)\n/, '')
      if (block.length > 0) {
        if (moduleName.includes('decentraland/sdk/components/common/') && isExportedByEcs(moduleName)) {
          // Nominal types (enums) shared with sdk components are already exported by
          // @dcl/sdk/ecs. Import them instead of re-declaring, so a value typed with the
          // @dcl/sdk/ecs declaration is assignable to the RPC request fields.
          for (const [, typeName] of block.matchAll(
            /export\s+(?:declare\s+)?(?:const\s+)?(?:enum|interface|type|class)\s+(\w+)/g
          )) {
            typesFromEcs.add(typeName)
          }
        } else {
          blocks.push(block)
        }
      } else {
        throw new Error('bad block')
      }
    } else {
      break
    }
    where += 'declare module'.length
  } while (where)

  let content = blocks.join('\n\t// Function declaration section').replace(/import(.*)\n/g, '')
  for (const typeName of typesFromEcs) {
    // '../ecs' is @dcl/ecs, always a sibling of @dcl/js-runtime (both under @dcl/) and the
    // same nominal types that @dcl/sdk/ecs re-exports. Inlined at each reference (instead of
    // a local alias) because everything declared in an ambient module is importable from it.
    content = content.replace(new RegExp(`\\b${typeName}\\b`, 'g'), `import('../ecs').${typeName}`)
  }
  writeFileSync(filePath, `declare module "~system/${apiName}" {\n${content}\n}`)
}
