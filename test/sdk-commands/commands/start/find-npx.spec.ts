import fs from 'fs'
import os from 'os'
import path from 'path'
import { findNpxCliJs } from '../../../../packages/@dcl/sdk-commands/src/commands/start/utils'

function touch(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, '')
  return file
}

describe('findNpxCliJs', () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'npx-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  describe('when node is a Windows install', () => {
    let execPath: string
    let npxCli: string

    beforeEach(() => {
      execPath = touch(path.join(root, 'nodejs', 'node.exe'))
      npxCli = touch(path.join(root, 'nodejs', 'node_modules', 'npm', 'bin', 'npx-cli.js'))
    })

    it('should find npx-cli.js under the node directory', () => {
      expect(findNpxCliJs({ execPath, pathEnv: '', npmBin: 'npm.cmd' })).toBe(npxCli)
    })
  })

  describe('when node is a unix install', () => {
    let execPath: string
    let npxCli: string

    beforeEach(() => {
      execPath = touch(path.join(root, 'prefix', 'bin', 'node'))
      npxCli = touch(path.join(root, 'prefix', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'))
    })

    it('should find npx-cli.js under the lib directory', () => {
      expect(findNpxCliJs({ execPath, pathEnv: '', npmBin: 'npm' })).toBe(npxCli)
    })
  })

  describe('when node is a version-manager shim and a Windows install is on PATH', () => {
    let execPath: string
    let npxCli: string
    let pathEnv: string

    beforeEach(() => {
      execPath = touch(path.join(root, 'shims', 'node.exe'))
      touch(path.join(root, 'nodejs', 'npm.cmd'))
      npxCli = touch(path.join(root, 'nodejs', 'node_modules', 'npm', 'bin', 'npx-cli.js'))
      pathEnv = [path.join(root, 'shims'), path.join(root, 'nodejs')].join(path.delimiter)
    })

    it('should find npx-cli.js under the directory that holds npm', () => {
      expect(findNpxCliJs({ execPath, pathEnv, npmBin: 'npm.cmd' })).toBe(npxCli)
    })
  })

  describe('when npm on PATH is a symlink into the npm package', () => {
    let execPath: string
    let npxCli: string
    let pathEnv: string

    beforeEach(() => {
      execPath = touch(path.join(root, 'elsewhere', 'node'))
      const npmCli = touch(path.join(root, 'Cellar', 'node', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'))
      npxCli = touch(path.join(root, 'Cellar', 'node', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'))
      fs.mkdirSync(path.join(root, 'bin'))
      fs.symlinkSync(npmCli, path.join(root, 'bin', 'npm'))
      pathEnv = path.join(root, 'bin')
    })

    it('should follow the symlink to npx-cli.js', () => {
      expect(findNpxCliJs({ execPath, pathEnv, npmBin: 'npm' })).toBe(fs.realpathSync(npxCli))
    })
  })

  describe('when running inside Electron with no node on PATH', () => {
    let execPath: string
    let npxCli: string
    let resourcesPath: string

    beforeEach(() => {
      execPath = touch(path.join(root, 'App', 'Creator Hub.exe'))
      resourcesPath = path.join(root, 'App', 'resources')
      npxCli = touch(path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'npm', 'bin', 'npx-cli.js'))
    })

    it('should find the npm unpacked from the asar', () => {
      expect(findNpxCliJs({ execPath, pathEnv: '', npmBin: 'npm.cmd', resourcesPath })).toBe(npxCli)
    })
  })

  describe('when running inside Electron and the OS also has npm on PATH', () => {
    let execPath: string
    let bundled: string
    let resourcesPath: string
    let pathEnv: string

    beforeEach(() => {
      execPath = touch(path.join(root, 'App', 'Creator Hub.exe'))
      resourcesPath = path.join(root, 'App', 'resources')
      bundled = touch(path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'npm', 'bin', 'npx-cli.js'))
      touch(path.join(root, 'nodejs', 'npm.cmd'))
      touch(path.join(root, 'nodejs', 'node_modules', 'npm', 'bin', 'npx-cli.js'))
      pathEnv = path.join(root, 'nodejs')
    })

    it('should prefer the npm shipped with the app over the one installed on the OS', () => {
      expect(findNpxCliJs({ execPath, pathEnv, npmBin: 'npm.cmd', resourcesPath })).toBe(bundled)
    })
  })

  describe('when no npm install is reachable', () => {
    let execPath: string

    beforeEach(() => {
      execPath = touch(path.join(root, 'shims', 'node'))
    })

    it('should return null', () => {
      expect(findNpxCliJs({ execPath, pathEnv: path.join(root, 'shims'), npmBin: 'npm' })).toBeNull()
    })
  })
})
