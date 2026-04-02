// Mock modules that have transitive dependencies requiring full monorepo build
jest.mock('../../../../packages/@dcl/sdk-commands/src/logic/scene-validations', () => ({}))
jest.mock('../../../../packages/@dcl/sdk-commands/src/logic/composite', () => ({}))
jest.mock('../../../../packages/@dcl/sdk-commands/src/logic/coordinates', () => ({}))
jest.mock('../../../../packages/@dcl/sdk-commands/src/logic/runtime-script', () => ({}))
jest.mock('../../../../packages/@dcl/sdk-commands/src/components/analytics', () => ({
  createAnalyticsComponent: () => ({ track: jest.fn() })
}))

import * as getContextFiles from '../../../../packages/@dcl/sdk-commands/src/commands/get-context-files/index'
import * as projectValidations from '../../../../packages/@dcl/sdk-commands/src/logic/project-validations'
import * as dclIgnore from '../../../../packages/@dcl/sdk-commands/src/logic/dcl-ignore'
import { initComponents, CliComponents } from '../../../../packages/@dcl/sdk-commands/src/components'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

function createMockFetch(fileTree: Record<string, string>) {
  /**
   * Simulates GitHub Contents API responses.
   * fileTree maps relative paths (e.g. 'overview/sdk7-complete-reference.md') to content strings.
   * Directory listings and file downloads are served from this tree.
   */
  return jest.fn(async (url: string) => {
    // GitHub API directory listing request
    if (url.includes('api.github.com/repos/')) {
      // Determine which "directory" is being listed from the URL
      const basePath = url.replace(/.*\/contents\/ai-sdk-context\/?/, '')
      const entries: Array<{ name: string; path: string; type: string; download_url?: string; url: string }> = []
      const seen = new Set<string>()

      for (const relPath of Object.keys(fileTree)) {
        // Check if this file is under the requested directory
        const prefix = basePath ? basePath + '/' : ''
        if (basePath && !relPath.startsWith(prefix)) continue
        if (!basePath && relPath.includes('/')) {
          // Top-level listing: show directories
          const topDir = relPath.split('/')[0]
          if (!seen.has(topDir)) {
            seen.add(topDir)
            entries.push({
              name: topDir,
              path: `ai-sdk-context/${topDir}`,
              type: 'dir',
              url: `https://api.github.com/repos/decentraland/docs/contents/ai-sdk-context/${topDir}`
            })
          }
          continue
        }
        if (!basePath && !relPath.includes('/')) {
          // Top-level file
          entries.push({
            name: relPath,
            path: `ai-sdk-context/${relPath}`,
            type: 'file',
            download_url: `https://raw.githubusercontent.com/decentraland/docs/main/ai-sdk-context/${relPath}`,
            url: `https://api.github.com/repos/decentraland/docs/contents/ai-sdk-context/${relPath}`
          })
          continue
        }

        const remainder = relPath.slice(prefix.length)
        if (remainder.includes('/')) {
          // Subdirectory entry
          const subDir = remainder.split('/')[0]
          if (!seen.has(subDir)) {
            seen.add(subDir)
            entries.push({
              name: subDir,
              path: `ai-sdk-context/${basePath}/${subDir}`,
              type: 'dir',
              url: `https://api.github.com/repos/decentraland/docs/contents/ai-sdk-context/${basePath}/${subDir}`
            })
          }
        } else {
          // File in this directory
          entries.push({
            name: remainder,
            path: `ai-sdk-context/${relPath}`,
            type: 'file',
            download_url: `https://raw.githubusercontent.com/decentraland/docs/main/ai-sdk-context/${relPath}`,
            url: `https://api.github.com/repos/decentraland/docs/contents/ai-sdk-context/${relPath}`
          })
        }
      }

      return {
        ok: true,
        json: async () => entries,
        text: async () => JSON.stringify(entries)
      }
    }

    // Raw file download request
    if (url.includes('raw.githubusercontent.com')) {
      const relPath = url.replace(/.*\/ai-sdk-context\//, '')
      const content = fileTree[relPath]
      if (content !== undefined) {
        return { ok: true, text: async () => content, json: async () => content }
      }
      return { ok: false, text: async () => 'Not found', json: async () => ({}) }
    }

    return { ok: false, text: async () => 'Unknown URL', json: async () => ({}) }
  })
}

describe('get-context-files command', () => {
  let components: CliComponents
  const testDir = '/tmp/test-scene'

  beforeEach(async () => {
    components = await initComponents()
    jest.spyOn(process, 'cwd').mockReturnValue(testDir)
    jest.spyOn(projectValidations, 'assertValidProjectFolder').mockResolvedValue(undefined as any)
  })

  it('should skip if not a valid scene', async () => {
    jest.spyOn(projectValidations, 'assertValidProjectFolder').mockRejectedValue(new Error('not valid'))
    const logSpy = jest.spyOn(components.logger, 'log')

    await getContextFiles.main({ args: { _: [] }, components })

    expect(logSpy).toHaveBeenCalledWith('Not a valid Scene...')
  })

  it('should download files preserving directory structure', async () => {
    const fileTree = {
      'sdk7-reference.mdc': '# SDK7 Reference',
      'skills/add-3d-models/SKILL.md': '# Add 3D Models Skill'
    }

    const mockFetch = createMockFetch(fileTree)
    jest.spyOn(components.fetch, 'fetch').mockImplementation(mockFetch as any)
    jest.spyOn(components.fs, 'directoryExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext`) return false
      if (p === `${testDir}/dclcontext/skills`) return true
      if (p === `${testDir}/dclcontext/skills/add-3d-models`) return true
      return false
    })
    jest.spyOn(components.fs, 'fileExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/CLAUDE.md`) return false
      if (p === `${testDir}/.cursorrules`) return false
      if (p === `${testDir}/dclcontext/skills/add-3d-models/SKILL.md`) return true
      return false
    })
    jest.spyOn(components.fs, 'readdir').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext/skills`) return ['add-3d-models']
      return []
    })

    const mkdirSpy = jest.spyOn(components.fs, 'mkdir').mockResolvedValue(undefined)
    const writeFileSpy = jest.spyOn(components.fs, 'writeFile').mockResolvedValue(undefined)
    const rmSpy = jest.spyOn(components.fs, 'rm').mockResolvedValue(undefined)
    const appendFileSpy = jest.spyOn(components.fs, 'appendFile').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'readFile').mockRejectedValue(new Error('not found'))

    await getContextFiles.main({ args: { _: [] }, components })

    // Verify nested directory was created
    expect(mkdirSpy).toHaveBeenCalledWith(
      expect.stringContaining('dclcontext/skills/add-3d-models'),
      { recursive: true }
    )

    // Verify files were written at correct nested paths
    const writeCalls = writeFileSpy.mock.calls.map(([p]) => p)
    expect(writeCalls).toContainEqual(expect.stringContaining('dclcontext/sdk7-reference.mdc'))
    expect(writeCalls).toContainEqual(expect.stringContaining('dclcontext/skills/add-3d-models/SKILL.md'))
  })

  it('should generate CLAUDE.md with skill links when absent', async () => {
    const fileTree = {
      'skills/build-ui/SKILL.md': '# Build UI Skill'
    }

    const mockFetch = createMockFetch(fileTree)
    jest.spyOn(components.fetch, 'fetch').mockImplementation(mockFetch as any)
    jest.spyOn(components.fs, 'directoryExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext`) return false
      if (p === `${testDir}/dclcontext/skills`) return true
      if (p === `${testDir}/dclcontext/skills/build-ui`) return true
      return false
    })
    jest.spyOn(components.fs, 'fileExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/CLAUDE.md`) return false
      if (p === `${testDir}/.cursorrules`) return false
      if (p === `${testDir}/dclcontext/skills/build-ui/SKILL.md`) return true
      return false
    })
    jest.spyOn(components.fs, 'readdir').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext/skills`) return ['build-ui']
      return []
    })

    const mkdirSpy = jest.spyOn(components.fs, 'mkdir').mockResolvedValue(undefined)
    const writeFileSpy = jest.spyOn(components.fs, 'writeFile').mockResolvedValue(undefined)
    const rmSpy = jest.spyOn(components.fs, 'rm').mockResolvedValue(undefined)
    const appendFileSpy = jest.spyOn(components.fs, 'appendFile').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'readFile').mockRejectedValue(new Error('not found'))

    await getContextFiles.main({ args: { _: [] }, components })

    // Find the CLAUDE.md write call
    const claudeCall = writeFileSpy.mock.calls.find(([p]) => (p as string).endsWith('CLAUDE.md'))
    expect(claudeCall).toBeDefined()
    const claudeContent = claudeCall![1] as string
    expect(claudeContent).toContain('dclcontext/skills/build-ui/SKILL.md')
    expect(claudeContent).toContain('Build Ui')
  })

  it('should not overwrite existing CLAUDE.md', async () => {
    const fileTree = { 'readme.mdc': '# readme' }

    const mockFetch = createMockFetch(fileTree)
    jest.spyOn(components.fetch, 'fetch').mockImplementation(mockFetch as any)
    jest.spyOn(components.fs, 'directoryExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext`) return false
      if (p === `${testDir}/dclcontext/skills`) return false
      return false
    })
    jest.spyOn(components.fs, 'fileExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/CLAUDE.md`) return true
      if (p === `${testDir}/.cursorrules`) return true
      return false
    })
    jest.spyOn(components.fs, 'readdir').mockResolvedValue([])

    const mkdirSpy = jest.spyOn(components.fs, 'mkdir').mockResolvedValue(undefined)
    const writeFileSpy = jest.spyOn(components.fs, 'writeFile').mockResolvedValue(undefined)
    const rmSpy = jest.spyOn(components.fs, 'rm').mockResolvedValue(undefined)
    const appendFileSpy = jest.spyOn(components.fs, 'appendFile').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'readFile').mockRejectedValue(new Error('not found'))
    const logSpy = jest.spyOn(components.logger, 'log')

    await getContextFiles.main({ args: { _: [] }, components })

    expect(logSpy).toHaveBeenCalledWith('[AI-Context] CLAUDE.md already exists, skipping')
    expect(logSpy).toHaveBeenCalledWith('[AI-Context] .cursorrules already exists, skipping')

    // CLAUDE.md and .cursorrules should not be written
    const writeCalls = writeFileSpy.mock.calls.map(([p]) => p)
    expect(writeCalls).not.toContainEqual(expect.stringContaining('CLAUDE.md'))
    expect(writeCalls).not.toContainEqual(expect.stringContaining('.cursorrules'))
  })

  it('should generate .cursorrules with skill links when absent', async () => {
    const fileTree = {
      'skills/camera-control/SKILL.md': '# Camera Control'
    }

    const mockFetch = createMockFetch(fileTree)
    jest.spyOn(components.fetch, 'fetch').mockImplementation(mockFetch as any)
    jest.spyOn(components.fs, 'directoryExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext`) return false
      if (p === `${testDir}/dclcontext/skills`) return true
      if (p === `${testDir}/dclcontext/skills/camera-control`) return true
      return false
    })
    jest.spyOn(components.fs, 'fileExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/CLAUDE.md`) return false
      if (p === `${testDir}/.cursorrules`) return false
      if (p === `${testDir}/dclcontext/skills/camera-control/SKILL.md`) return true
      return false
    })
    jest.spyOn(components.fs, 'readdir').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext/skills`) return ['camera-control']
      return []
    })

    const mkdirSpy = jest.spyOn(components.fs, 'mkdir').mockResolvedValue(undefined)
    const writeFileSpy = jest.spyOn(components.fs, 'writeFile').mockResolvedValue(undefined)
    const rmSpy = jest.spyOn(components.fs, 'rm').mockResolvedValue(undefined)
    const appendFileSpy = jest.spyOn(components.fs, 'appendFile').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'readFile').mockRejectedValue(new Error('not found'))

    await getContextFiles.main({ args: { _: [] }, components })

    const cursorCall = writeFileSpy.mock.calls.find(([p]) => (p as string).endsWith('.cursorrules'))
    expect(cursorCall).toBeDefined()
    const cursorContent = cursorCall![1] as string
    expect(cursorContent).toContain('dclcontext/skills/camera-control/SKILL.md')
    expect(cursorContent).toContain('dclcontext/')
  })

  it('should update .dclignore with CLAUDE.md and .cursorrules entries', async () => {
    const fileTree = { 'readme.mdc': '# readme' }

    const mockFetch = createMockFetch(fileTree)
    jest.spyOn(components.fetch, 'fetch').mockImplementation(mockFetch as any)
    jest.spyOn(components.fs, 'directoryExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext`) return false
      if (p === `${testDir}/dclcontext/skills`) return false
      return false
    })
    jest.spyOn(components.fs, 'fileExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/CLAUDE.md`) return false
      if (p === `${testDir}/.cursorrules`) return false
      return false
    })
    jest.spyOn(components.fs, 'readdir').mockResolvedValue([])
    jest.spyOn(components.fs, 'mkdir').mockResolvedValue(undefined)
    const writeFileSpy = jest.spyOn(components.fs, 'writeFile').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'rm').mockResolvedValue(undefined)
    const appendFileSpy = jest.spyOn(components.fs, 'appendFile').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'readFile').mockImplementation(async (p: any) => {
      if (String(p).endsWith('.dclignore')) return 'node_modules\ndclcontext\n' as any
      throw new Error('not found')
    })

    await getContextFiles.main({ args: { _: [] }, components })

    // .dclignore should have been appended with missing entries
    expect(appendFileSpy).toHaveBeenCalledWith(
      expect.stringContaining('.dclignore'),
      expect.stringContaining('CLAUDE.md')
    )
  })

  it('should not throw if CLAUDE.md generation fails', async () => {
    const fileTree = { 'readme.mdc': '# readme' }

    const mockFetch = createMockFetch(fileTree)
    jest.spyOn(components.fetch, 'fetch').mockImplementation(mockFetch as any)
    jest.spyOn(components.fs, 'directoryExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext`) return false
      if (p === `${testDir}/dclcontext/skills`) return true
      return false
    })
    jest.spyOn(components.fs, 'fileExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/CLAUDE.md`) return false
      if (p === `${testDir}/.cursorrules`) return false
      return false
    })
    // Make readdir throw to trigger error in discoverSkills
    jest.spyOn(components.fs, 'readdir').mockRejectedValue(new Error('permission denied'))
    jest.spyOn(components.fs, 'mkdir').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'writeFile').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'rm').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'appendFile').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'readFile').mockRejectedValue(new Error('not found'))
    const logSpy = jest.spyOn(components.logger, 'log')

    // Should not throw
    await getContextFiles.main({ args: { _: [] }, components })

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[AI-Context] Failed to generate CLAUDE.md'))
  })

  it('should remove old dclcontext directory before downloading', async () => {
    const fileTree = { 'readme.mdc': '# readme' }

    const mockFetch = createMockFetch(fileTree)
    jest.spyOn(components.fetch, 'fetch').mockImplementation(mockFetch as any)
    jest.spyOn(components.fs, 'directoryExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/dclcontext`) return true
      if (p === `${testDir}/dclcontext/skills`) return false
      return false
    })
    jest.spyOn(components.fs, 'fileExists').mockImplementation(async (p: string) => {
      if (p === `${testDir}/CLAUDE.md`) return false
      if (p === `${testDir}/.cursorrules`) return false
      return false
    })
    jest.spyOn(components.fs, 'readdir').mockResolvedValue([])
    jest.spyOn(components.fs, 'mkdir').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'writeFile').mockResolvedValue(undefined)
    const rmSpy = jest.spyOn(components.fs, 'rm').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'appendFile').mockResolvedValue(undefined)
    jest.spyOn(components.fs, 'readFile').mockRejectedValue(new Error('not found'))

    await getContextFiles.main({ args: { _: [] }, components })

    expect(rmSpy).toHaveBeenCalledWith(`${testDir}/dclcontext`, { recursive: true })
  })
})

describe('ensureDclIgnoreEntries', () => {
  let components: CliComponents

  beforeEach(async () => {
    components = await initComponents()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('should create .dclignore with entries if file does not exist', async () => {
    jest.spyOn(components.fs, 'readFile').mockRejectedValue(new Error('not found'))
    const writeFileSpy = jest.spyOn(components.fs, 'writeFile').mockResolvedValue(undefined)

    await dclIgnore.ensureDclIgnoreEntries(components, '/test', ['CLAUDE.md', '.cursorrules'])

    expect(writeFileSpy).toHaveBeenCalledWith(
      expect.stringContaining('.dclignore'),
      'CLAUDE.md\n.cursorrules\n'
    )
  })

  it('should append only missing entries to existing .dclignore', async () => {
    jest.spyOn(components.fs, 'readFile').mockResolvedValue('node_modules\nCLAUDE.md\n' as any)
    const appendFileSpy = jest.spyOn(components.fs, 'appendFile').mockResolvedValue(undefined)

    await dclIgnore.ensureDclIgnoreEntries(components, '/test', ['CLAUDE.md', '.cursorrules'])

    expect(appendFileSpy).toHaveBeenCalledWith(
      expect.stringContaining('.dclignore'),
      '.cursorrules\n'
    )
  })

  it('should not modify .dclignore if all entries already present', async () => {
    jest.spyOn(components.fs, 'readFile').mockResolvedValue('CLAUDE.md\n.cursorrules\n' as any)
    const appendFileSpy = jest.spyOn(components.fs, 'appendFile').mockResolvedValue(undefined)
    const writeFileSpy = jest.spyOn(components.fs, 'writeFile').mockResolvedValue(undefined)

    await dclIgnore.ensureDclIgnoreEntries(components, '/test', ['CLAUDE.md', '.cursorrules'])

    expect(appendFileSpy).not.toHaveBeenCalled()
    expect(writeFileSpy).not.toHaveBeenCalled()
  })
})
