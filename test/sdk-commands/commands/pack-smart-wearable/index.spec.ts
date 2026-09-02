import path from 'path'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { Writable } from 'stream'

import { packSmartWearable } from '../../../../packages/@dcl/sdk-commands/src/commands/pack-smart-wearable'
import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'
import { initLanguage, Language } from '../../../../packages/@dcl/sdk-commands/src/logic/lang'
import { WearableProject } from '../../../../packages/@dcl/sdk-commands/src/logic/project-validations'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const PROJECT_DIR = path.resolve(REPO_ROOT, 'tmp/pack-smart-wearable')

/** Signature of the end-of-central-directory record a finished zip ends with. */
const END_OF_CENTRAL_DIRECTORY = Buffer.from([0x50, 0x4b, 0x05, 0x06])
/** Signature every stored entry starts with. Entry names are not compressed. */
const LOCAL_FILE_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04])

function readArchive() {
  return readFileSync(path.join(PROJECT_DIR, 'smart-wearable.zip'))
}

function countEntries(archive: Buffer) {
  let count = 0
  for (let index = 0; index + 4 <= archive.length; index++) {
    if (archive.subarray(index, index + 4).equals(LOCAL_FILE_HEADER)) count++
  }
  return count
}

const SCENE_JSON = {
  ecs7: true,
  runtimeVersion: '7',
  display: { title: 'wearable' },
  main: 'bin/game.js',
  scene: { parcels: ['0,0'], base: '0,0' },
  requiredPermissions: [],
  menuBarIcon: ''
}

const WEARABLE_JSON = {
  name: 'test wearable',
  description: '',
  rarity: 'common',
  data: { category: 'hat', hides: [], replaces: [], tags: [], representations: [] }
}

function writeFile(filePath: string, contents: string) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}

describe('when packing a smart wearable from a different working directory', () => {
  let project: WearableProject
  let logger: { log: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock }
  let analytics: { track: jest.Mock }
  let pack: () => Promise<void>

  beforeEach(async () => {
    await initLanguage(Language.EN)

    rmSync(PROJECT_DIR, { recursive: true, force: true })
    writeFile(path.join(PROJECT_DIR, 'package.json'), JSON.stringify({ name: 'wearable', version: '1.0.0' }))
    writeFile(path.join(PROJECT_DIR, 'scene.json'), JSON.stringify(SCENE_JSON))
    writeFile(path.join(PROJECT_DIR, 'wearable.json'), JSON.stringify(WEARABLE_JSON))
    writeFile(path.join(PROJECT_DIR, 'bin/game.js'), '// bundled scene')

    project = { kind: 'smart-wearable', workingDirectory: PROJECT_DIR, scene: SCENE_JSON as WearableProject['scene'] }
    logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
    analytics = { track: jest.fn() }

    // The repo root, which is where the suite runs and is not the project.
    pack = () =>
      packSmartWearable(
        {
          args: { _: [], '--skip-build': true, '--skip-install': true, '--dir': PROJECT_DIR },
          components: { fs: createFsComponent(), logger, analytics, spawner: {} } as any
        } as any,
        project
      )
  })

  afterEach(() => {
    rmSync(PROJECT_DIR, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('should write an archive that was finished off properly', async () => {
    await pack()

    expect(readArchive().includes(END_OF_CENTRAL_DIRECTORY)).toBe(true)
  })

  it('should store one entry per publishable project file', async () => {
    await pack()

    // package.json is not a publishable file, so three of the four are packed.
    expect(countEntries(readArchive())).toBe(3)
  })

  it('should name the entries relative to the project', async () => {
    await pack()
    const archive = readArchive().toString('latin1')

    expect(['scene.json', 'wearable.json', 'bin/game.js'].every((name) => archive.includes(name))).toBe(true)
  })

  it('should report success only once it has packed', async () => {
    await pack()

    expect(logger.log).toHaveBeenCalledWith('Smart wearable packed successfully.')
  })
})

describe('when the smart wearable zip cannot be written', () => {
  let logger: { log: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock }
  let pack: () => Promise<void>

  beforeEach(async () => {
    await initLanguage(Language.EN)

    rmSync(PROJECT_DIR, { recursive: true, force: true })
    writeFile(path.join(PROJECT_DIR, 'package.json'), JSON.stringify({ name: 'wearable', version: '1.0.0' }))
    writeFile(path.join(PROJECT_DIR, 'scene.json'), JSON.stringify(SCENE_JSON))
    writeFile(path.join(PROJECT_DIR, 'wearable.json'), JSON.stringify(WEARABLE_JSON))
    writeFile(path.join(PROJECT_DIR, 'bin/game.js'), '// bundled scene')

    logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }

    const fs = createFsComponent()
    // Whatever the cause, a file that cannot be read has to fail the command.
    jest.spyOn(fs, 'createWriteStream').mockImplementation(() => {
      throw new Error('disk is full')
    })

    pack = () =>
      packSmartWearable(
        {
          args: { _: [], '--skip-build': true, '--skip-install': true, '--dir': PROJECT_DIR },
          components: { fs, logger, analytics: { track: jest.fn() }, spawner: {} } as any
        } as any,
        {
          kind: 'smart-wearable',
          workingDirectory: PROJECT_DIR,
          scene: SCENE_JSON as WearableProject['scene']
        }
      )
  })

  afterEach(() => {
    rmSync(PROJECT_DIR, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('should fail instead of resolving', async () => {
    await expect(pack()).rejects.toThrow('disk is full')
  })

  it('should not claim it packed successfully', async () => {
    await pack().catch(() => undefined)

    expect(logger.log).not.toHaveBeenCalledWith('Smart wearable packed successfully.')
  })
})

describe('when the smart wearable zip fails after the write stream is open', () => {
  let logger: { log: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock }
  let pack: () => Promise<void>

  beforeEach(async () => {
    await initLanguage(Language.EN)

    rmSync(PROJECT_DIR, { recursive: true, force: true })
    writeFile(path.join(PROJECT_DIR, 'package.json'), JSON.stringify({ name: 'wearable', version: '1.0.0' }))
    writeFile(path.join(PROJECT_DIR, 'scene.json'), JSON.stringify(SCENE_JSON))
    writeFile(path.join(PROJECT_DIR, 'wearable.json'), JSON.stringify(WEARABLE_JSON))
    writeFile(path.join(PROJECT_DIR, 'bin/game.js'), '// bundled scene')

    logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }

    const fs = createFsComponent()
    // A real write failure — full disk, revoked permission, vanished directory — is
    // reported asynchronously on the stream, not thrown by createWriteStream. This
    // stream also never finishes, so nothing else can settle the promise.
    jest.spyOn(fs, 'createWriteStream').mockImplementation(() => {
      const output = new Writable({
        write() {
          // Never invoke the callback: the stream stalls the way a dead device does.
        }
      })
      setTimeout(() => output.emit('error', new Error('no space left on device')), 10)
      return output as any
    })

    pack = () =>
      packSmartWearable(
        {
          args: { _: [], '--skip-build': true, '--skip-install': true, '--dir': PROJECT_DIR },
          components: { fs, logger, analytics: { track: jest.fn() }, spawner: {} } as any
        } as any,
        {
          kind: 'smart-wearable',
          workingDirectory: PROJECT_DIR,
          scene: SCENE_JSON as WearableProject['scene']
        }
      )
  })

  afterEach(() => {
    rmSync(PROJECT_DIR, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('should reject with the reason the stream reported', async () => {
    await expect(pack()).rejects.toThrow('no space left on device')
  })

  it('should not claim it packed successfully', async () => {
    await pack().catch(() => undefined)

    expect(logger.log).not.toHaveBeenCalledWith('Smart wearable packed successfully.')
  })
})

describe('when the zip step rejects with something that is not an Error', () => {
  let logger: { log: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock }
  let pack: () => Promise<void>

  beforeEach(async () => {
    await initLanguage(Language.EN)

    rmSync(PROJECT_DIR, { recursive: true, force: true })
    writeFile(path.join(PROJECT_DIR, 'package.json'), JSON.stringify({ name: 'wearable', version: '1.0.0' }))
    writeFile(path.join(PROJECT_DIR, 'scene.json'), JSON.stringify(SCENE_JSON))
    writeFile(path.join(PROJECT_DIR, 'wearable.json'), JSON.stringify(WEARABLE_JSON))
    writeFile(path.join(PROJECT_DIR, 'bin/game.js'), '// bundled scene')

    logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }

    const fs = createFsComponent()
    jest.spyOn(fs, 'createWriteStream').mockImplementation(() => {
      // eslint-disable-next-line no-throw-literal
      throw 'archiver blew up'
    })

    pack = () =>
      packSmartWearable(
        {
          args: { _: [], '--skip-build': true, '--skip-install': true, '--dir': PROJECT_DIR },
          components: { fs, logger, analytics: { track: jest.fn() }, spawner: {} } as any
        } as any,
        {
          kind: 'smart-wearable',
          workingDirectory: PROJECT_DIR,
          scene: SCENE_JSON as WearableProject['scene']
        }
      )
  })

  afterEach(() => {
    rmSync(PROJECT_DIR, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('should report what was thrown rather than undefined', async () => {
    await expect(pack()).rejects.toThrow('archiver blew up')
  })
})

describe('when a project file is a symlink pointing outside the project', () => {
  let logger: { log: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock }
  let outsideDir: string
  let pack: () => Promise<void>

  beforeEach(async () => {
    await initLanguage(Language.EN)

    outsideDir = path.resolve(REPO_ROOT, 'tmp/pack-smart-wearable-outside')
    rmSync(PROJECT_DIR, { recursive: true, force: true })
    rmSync(outsideDir, { recursive: true, force: true })
    writeFile(path.join(PROJECT_DIR, 'package.json'), JSON.stringify({ name: 'wearable', version: '1.0.0' }))
    writeFile(path.join(PROJECT_DIR, 'scene.json'), JSON.stringify(SCENE_JSON))
    writeFile(path.join(PROJECT_DIR, 'wearable.json'), JSON.stringify(WEARABLE_JSON))
    writeFile(path.join(PROJECT_DIR, 'bin/game.js'), '// bundled scene')

    // Something private that lives outside the project, linked in under an innocent name.
    writeFile(path.join(outsideDir, 'id_rsa'), 'PRIVATE KEY')
    symlinkSync(path.join(outsideDir, 'id_rsa'), path.join(PROJECT_DIR, 'notes.txt'))

    logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }

    pack = () =>
      packSmartWearable(
        {
          args: { _: [], '--skip-build': true, '--skip-install': true, '--dir': PROJECT_DIR },
          components: {
            fs: createFsComponent(),
            logger,
            analytics: { track: jest.fn() },
            spawner: {}
          } as any
        } as any,
        {
          kind: 'smart-wearable',
          workingDirectory: PROJECT_DIR,
          scene: SCENE_JSON as WearableProject['scene']
        }
      )
  })

  afterEach(() => {
    rmSync(PROJECT_DIR, { recursive: true, force: true })
    rmSync(outsideDir, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('should refuse to pack instead of archiving the linked file', async () => {
    await expect(pack()).rejects.toThrow('resolve outside the project folder')
  })

  it('should name the offending file', async () => {
    await expect(pack()).rejects.toThrow('notes.txt')
  })

  it('should not leave a zip behind', async () => {
    await pack().catch(() => undefined)

    expect(existsSync(path.join(PROJECT_DIR, 'smart-wearable.zip'))).toBe(false)
  })
})
