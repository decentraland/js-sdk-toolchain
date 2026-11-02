import fs from 'fs'
import os from 'os'
import path from 'path'
import esbuild from '../../../../packages/@dcl/sdk-commands/node_modules/esbuild'
import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'
import {
  bundleProject,
  BundleComponents,
  CompileOptions
} from '../../../../packages/@dcl/sdk-commands/src/logic/bundle'

jest.mock('../../../../packages/@dcl/sdk-commands/node_modules/esbuild', () => ({ context: jest.fn() }))

// Stop at the compiler boundary: these tests exercise the build's real JSON updates.
describe('when a scene build configures its server logs script', () => {
  let directory: string
  let packageFile: string
  let components: BundleComponents
  let options: CompileOptions
  let compilerBoundary: Error
  let original: string

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-logs-script-'))
    packageFile = path.join(directory, 'package.json')
    fs.mkdirSync(path.join(directory, 'src'))
    fs.writeFileSync(path.join(directory, 'src/index.ts'), '')
    fs.writeFileSync(path.join(directory, 'tsconfig.json'), '{}')
    fs.writeFileSync(path.join(directory, 'scene.json'), '{"authoritativeMultiplayer":false}')
    components = {
      fs: createFsComponent(),
      logger: { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
    }
    options = {
      workingDirectory: directory,
      production: false,
      watch: false,
      emitDeclaration: false,
      ignoreComposite: true,
      customEntryPoint: true
    }
    compilerBoundary = new Error('compiler boundary')
    jest.mocked(esbuild.context).mockRejectedValue(compilerBoundary)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    fs.rmSync(directory, { recursive: true, force: true })
  })

  async function build(): Promise<void> {
    await expect(
      bundleProject(components, options, { main: 'bin/game.js', runtimeVersion: '7' } as Parameters<
        typeof bundleProject
      >[2])
    ).rejects.toBe(compilerBoundary)
  }

  describe.each([undefined, 'sdk-commands sdk-server-logs'])('and the previous script is %s', (previous) => {
    beforeEach(() => {
      fs.writeFileSync(
        packageFile,
        JSON.stringify({ name: 'scene', scripts: { build: 'sdk-commands build', 'server-logs': previous } })
      )
    })

    it('should use Insights and retain the other package and scene settings', async () => {
      await build()
      expect(JSON.parse(fs.readFileSync(packageFile, 'utf8'))).toEqual({
        name: 'scene',
        scripts: { build: 'sdk-commands build', 'server-logs': 'sdk-commands scene-insights tail' }
      })
      expect(JSON.parse(fs.readFileSync(path.join(directory, 'scene.json'), 'utf8')).authoritativeMultiplayer).toBe(
        false
      )
    })

    it('should leave the package unchanged on a second build', async () => {
      await build()
      original = fs.readFileSync(packageFile, 'utf8')
      await build()
      expect(fs.readFileSync(packageFile, 'utf8')).toBe(original)
    })
  })

  describe.each([
    'node custom-logs.js',
    'sdk-commands sdk-server-logs --world custom.dcl.eth',
    'sdk-commands scene-insights tail',
    ''
  ])('and the script is customized or current: %s', (script) => {
    beforeEach(() => {
      original = JSON.stringify({ scripts: { 'server-logs': script } })
      fs.writeFileSync(packageFile, original)
    })

    it('should preserve the package byte for byte', async () => {
      await build()
      expect(fs.readFileSync(packageFile, 'utf8')).toBe(original)
    })
  })

  describe('and there is no scripts object', () => {
    beforeEach(() => {
      fs.writeFileSync(packageFile, '{"name":"scene"}')
    })

    it('should add the Insights script', async () => {
      await build()
      expect(JSON.parse(fs.readFileSync(packageFile, 'utf8')).scripts).toEqual({
        'server-logs': 'sdk-commands scene-insights tail'
      })
    })
  })

  describe('and building a single file', () => {
    beforeEach(() => {
      options.single = 'src/index.ts'
      original = '{"scripts":{"server-logs":"sdk-commands sdk-server-logs"}}'
      fs.writeFileSync(packageFile, original)
    })

    it('should not migrate project defaults', async () => {
      await build()
      expect(fs.readFileSync(packageFile, 'utf8')).toBe(original)
    })
  })
})
