import * as ts from 'typescript'
import { inspect } from 'util'

export type PackageJson = {
  main: string

  // only package.json
  typings?: string
  types?: string
}

export type SceneJson = {
  main: string
}

function validateSceneJson(sceneJson: SceneJson) {
  if (!sceneJson.main) {
    console.dir(sceneJson)
    throw new Error(`field "main" in scene.json is missing.`)
  }
}

function loadSceneJson(): SceneJson {
  const content = ts.sys.readFile('scene.json')
  if (content === undefined) {
    throw new Error('scene.json not found')
  }
  try {
    return JSON.parse(content)
  } catch {
    throw new Error('Error reading scene.json')
  }
}

export function readPackageJson(): PackageJson {
  const content = ts.sys.readFile('package.json')
  if (content === undefined) {
    throw new Error('package.json not found')
  }
  try {
    return JSON.parse(content)
  } catch {
    throw new Error('Error reading package.json')
  }
}

export function readTsconfig(): any {
  const content = ts.sys.readFile('tsconfig.json')
  if (content === undefined) {
    throw new Error('tsconfig.json not found')
  }
  try {
    return JSON.parse(content)
  } catch {
    throw new Error('Error reading tsconfig.json')
  }
}

export function checkConfiguration(_packageJson: PackageJson) {
  const host: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory
  }

  const sceneJson: SceneJson = loadSceneJson()

  const tsconfigPath = ts.sys.resolvePath('tsconfig.json')
  const tsconfigContent = ts.sys.readFile(tsconfigPath)

  if (!tsconfigContent) {
    console.error(`! Error: missing tsconfig.json file`)
    process.exit(1)
  }

  const parsed = ts.parseConfigFileTextToJson('tsconfig.json', tsconfigContent)

  if (parsed.error) {
    printDiagnostic(parsed.error)
    process.exit(1)
  }

  const tsconfig = ts.parseJsonConfigFileContent(
    parsed.config,
    host,
    ts.sys.getCurrentDirectory(),
    {},
    'tsconfig.json'
  )

  const hasError = false

  // should this project be compiled as a lib? or as a scene?

  if (!sceneJson) {
    console.error('! Error: project of type scene must have a scene.json')
    process.exit(1)
  }

  validateSceneJson(sceneJson!)

  if (hasError) {
    console.log('tsconfig.json:')
    console.log(inspect(tsconfig, false, 10, true))
    process.exit(1)
  }
}

function printDiagnostic(diagnostic: ts.Diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  if (diagnostic.file) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start!
    )
    console.log(
      `  Error ${diagnostic.file.fileName.replace(
        ts.sys.getCurrentDirectory(),
        ''
      )} (${line + 1},${character + 1}): ${message}`
    )
  } else {
    console.log(`  Error: ${message}`)
  }
}

export function loadArtifact(path: string): string {
  try {
    const resolved = resolveFile(path)
    if (resolved) {
      return ts.sys.readFile(resolved)!
    }

    throw new Error()
  } catch (e) {
    console.error(`! Error: ${path} not found. ` + e)
    process.exit(2)
  }
}

export function resolveFile(path: string): string | null {
  let resolved = ts.sys.resolvePath(path)

  if (ts.sys.fileExists(resolved)) {
    return resolved
  }

  resolved = ts.sys.resolvePath('node_modules/' + path)

  if (ts.sys.fileExists(resolved)) {
    return resolved
  }

  resolved = ts.sys.resolvePath('../node_modules/' + path)

  if (ts.sys.fileExists(resolved)) {
    return resolved
  }

  resolved = ts.sys.resolvePath('../../node_modules/' + path)

  if (ts.sys.fileExists(resolved)) {
    return resolved
  }

  return null
}
