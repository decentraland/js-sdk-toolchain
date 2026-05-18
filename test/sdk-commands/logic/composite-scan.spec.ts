import fs from 'fs'
import os from 'os'
import path from 'path'

import { getAllComposites } from '../../../packages/@dcl/sdk-commands/src/logic/composite'

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
  }
}

function makeFs() {
  return {
    readFile: jest.fn().mockImplementation((p: string) => Promise.resolve(fs.readFileSync(p))),
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}

describe('getAllComposites — composite.json scan hardening', () => {
  let workingDir: string

  beforeEach(() => {
    workingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'composite-scan-'))
  })

  afterEach(() => {
    fs.rmSync(workingDir, { recursive: true, force: true })
  })

  it('excludes composite.json under node_modules from component registrations', async () => {
    // Legitimate asset-pack composite under assets/.
    const legitDir = path.join(workingDir, 'assets', 'asset-packs', 'legit')
    fs.mkdirSync(legitDir, { recursive: true })
    fs.writeFileSync(
      path.join(legitDir, 'composite.json'),
      JSON.stringify({
        version: 1,
        components: [
          { name: 'legit::Custom', jsonSchema: { serializationType: 'map', extras: {}, fields: {} }, data: {} }
        ]
      })
    )

    // Malicious composite under node_modules.
    const evilDir = path.join(workingDir, 'node_modules', 'evil-pkg')
    fs.mkdirSync(evilDir, { recursive: true })
    fs.writeFileSync(
      path.join(evilDir, 'composite.json'),
      JSON.stringify({
        version: 1,
        components: [
          { name: 'evil::Injected', jsonSchema: { serializationType: 'map', extras: {}, fields: {} }, data: {} }
        ]
      })
    )

    // Nested node_modules variant.
    const nestedEvilDir = path.join(workingDir, 'assets', 'foo', 'node_modules', 'nested')
    fs.mkdirSync(nestedEvilDir, { recursive: true })
    fs.writeFileSync(
      path.join(nestedEvilDir, 'composite.json'),
      JSON.stringify({
        version: 1,
        components: [
          {
            name: 'evil::NestedInjected',
            jsonSchema: { serializationType: 'map', extras: {}, fields: {} },
            data: {}
          }
        ]
      })
    )

    const logger = makeLogger()
    const components = { logger, fs: makeFs() } as any
    const result = await getAllComposites(components, workingDir)

    const names = result.componentRegistrations.map((r) => r.name)
    // composite::root is always pre-registered.
    expect(names).toContain('legit::Custom')
    expect(names).not.toContain('evil::Injected')
    expect(names).not.toContain('evil::NestedInjected')
  })

  it('logs a warn and skips composite.json files above the size cap', async () => {
    const legitDir = path.join(workingDir, 'assets', 'huge')
    fs.mkdirSync(legitDir, { recursive: true })
    // 17 MB payload, well above the 16 MB cap.
    const big = `{"junk":"${'x'.repeat(17 * 1024 * 1024)}"}`
    fs.writeFileSync(path.join(legitDir, 'composite.json'), big)

    const logger = makeLogger()
    const components = { logger, fs: makeFs() } as any
    await getAllComposites(components, workingDir)

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('exceeds cap'))
  })

  it('logs a debug skip (no throw) for malformed composite.json', async () => {
    const dir = path.join(workingDir, 'assets', 'broken')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'composite.json'), '{not valid json')

    const logger = makeLogger()
    const components = { logger, fs: makeFs() } as any
    await expect(getAllComposites(components, workingDir)).resolves.toBeDefined()
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("skipped 'assets/broken/composite.json'"))
  })
})
