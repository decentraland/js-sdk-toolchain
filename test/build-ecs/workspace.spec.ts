import path, { resolve } from 'path'
import { itExecutes } from '../../scripts/helpers'

describe('workspace: build a workspace using the CLI', () => {
  const cwd = resolve(__dirname, './fixtures')

  itExecutes(path.resolve(process.cwd(), './packages/@dcl/sdk-commands/dist/index.js') + ' build', cwd)
})

describe('workspace: export-static a workspace using the CLI', () => {
  const cwd = resolve(__dirname, './fixtures')

  itExecutes(
    path.resolve(process.cwd(), './packages/@dcl/sdk-commands/dist/index.js') +
      ' export-static --destination tmp/ipfs --realmName testRealm --baseUrl https://hola.com',
    cwd
  )
})
