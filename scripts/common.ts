import { resolve } from 'path'
import { ensureFileExists } from './helpers'

export const flow = describe

// TOOLS
export const TSC = resolve(process.cwd(), './node_modules/typescript/bin/tsc')

// WORKING DIRECTORIES
export const SDK_PATH = resolve(process.cwd(), './packages/@dcl/sdk')
export const SDK_COMMANDS_PATH = resolve(process.cwd(), './packages/@dcl/sdk-commands')
export const INSPECTOR_PATH = resolve(process.cwd(), './packages/@dcl/inspector')
export const PLAYGROUND_ASSETS_PATH = resolve(process.cwd(), './packages/@dcl/playground-assets')
export const ECS7_PATH = resolve(process.cwd(), './packages/@dcl/ecs')
export const JS_RUNTIME = resolve(process.cwd(), './packages/@dcl/js-runtime')
export const REACT_ECS = resolve(process.cwd(), './packages/@dcl/react-ecs')

export function commonChecks() {
  test('tooling is installed', () => {
    ensureFileExists(TSC)
  })
}
