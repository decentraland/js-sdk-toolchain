import path from 'path'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'

import * as components from '../../../../packages/@dcl/ecs/src/components'
import { Engine } from '../../../../packages/@dcl/ecs/src/engine'
import { migrateAssets } from '../../../../packages/@dcl/sdk-commands/src/commands/code-to-composite/asset-migrator'
import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'
import { SceneProject } from '../../../../packages/@dcl/sdk-commands/src/logic/project-validations'

const REPO_ROOT = path.resolve(__dirname, '../../../..')

function makeLogger() {
  return { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}

function makeProject(workingDirectory: string): SceneProject {
  return {
    kind: 'scene',
    workingDirectory,
    scene: { main: 'bin/game.js', scene: { base: '0,0', parcels: ['0,0'] } } as SceneProject['scene']
  }
}

function writeFile(filePath: string, contents: string) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}

describe('when two models in different folders share a file name', () => {
  let sceneRoot: string
  let engine: ReturnType<typeof Engine>
  let GltfContainer: ReturnType<typeof components.GltfContainer>
  let firstEntity: ReturnType<typeof engine.addEntity>
  let secondEntity: ReturnType<typeof engine.addEntity>

  beforeEach(async () => {
    sceneRoot = path.resolve(REPO_ROOT, 'tmp/asset-migrator-collision')
    rmSync(sceneRoot, { recursive: true, force: true })
    writeFile(path.join(sceneRoot, 'models/a/tree.glb'), 'FIRST MODEL')
    writeFile(path.join(sceneRoot, 'models/b/tree.glb'), 'SECOND MODEL')

    engine = Engine()
    GltfContainer = components.GltfContainer(engine)
    firstEntity = engine.addEntity()
    secondEntity = engine.addEntity()
    GltfContainer.create(firstEntity, { src: 'models/a/tree.glb' })
    GltfContainer.create(secondEntity, { src: 'models/b/tree.glb' })

    await migrateAssets({ fs: createFsComponent(), logger: makeLogger() } as any, makeProject(sceneRoot), engine as any)
  })

  afterEach(() => {
    rmSync(sceneRoot, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('should point the two components at different files', () => {
    expect(GltfContainer.get(firstEntity).src).not.toBe(GltfContainer.get(secondEntity).src)
  })

  it('should keep the contents of the first model', () => {
    const migrated = path.join(sceneRoot, GltfContainer.get(firstEntity).src)

    expect(readFileSync(migrated, 'utf8')).toBe('FIRST MODEL')
  })

  it('should keep the contents of the second model', () => {
    const migrated = path.join(sceneRoot, GltfContainer.get(secondEntity).src)

    expect(readFileSync(migrated, 'utf8')).toBe('SECOND MODEL')
  })
})

describe('when two images in different folders share a file name', () => {
  let sceneRoot: string
  let engine: ReturnType<typeof Engine>
  let Material: ReturnType<typeof components.Material>
  let firstEntity: ReturnType<typeof engine.addEntity>
  let secondEntity: ReturnType<typeof engine.addEntity>

  beforeEach(async () => {
    sceneRoot = path.resolve(REPO_ROOT, 'tmp/asset-migrator-image-collision')
    rmSync(sceneRoot, { recursive: true, force: true })
    writeFile(path.join(sceneRoot, 'images/ui/logo.png'), 'UI LOGO')
    writeFile(path.join(sceneRoot, 'images/world/logo.png'), 'WORLD LOGO')

    engine = Engine()
    Material = components.Material(engine)
    firstEntity = engine.addEntity()
    secondEntity = engine.addEntity()
    Material.setBasicMaterial(firstEntity, { texture: Material.Texture.Common({ src: 'images/ui/logo.png' }) })
    Material.setBasicMaterial(secondEntity, { texture: Material.Texture.Common({ src: 'images/world/logo.png' }) })

    await migrateAssets({ fs: createFsComponent(), logger: makeLogger() } as any, makeProject(sceneRoot), engine as any)
  })

  afterEach(() => {
    rmSync(sceneRoot, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('should write both images instead of one replacing the other', () => {
    const written = [
      path.join(sceneRoot, 'assets/scene/Images/logo.png'),
      path.join(sceneRoot, 'assets/scene/Images/logo-2.png')
    ]

    expect(written.map((file) => readFileSync(file, 'utf8')).sort()).toEqual(['UI LOGO', 'WORLD LOGO'])
  })
})

describe('when a model points at a texture inside a subfolder', () => {
  let sceneRoot: string
  let engine: ReturnType<typeof Engine>
  let logger: ReturnType<typeof makeLogger>
  let migrate: () => Promise<number>

  beforeEach(() => {
    sceneRoot = path.resolve(REPO_ROOT, 'tmp/asset-migrator-nested-dep')
    rmSync(sceneRoot, { recursive: true, force: true })
    writeFile(
      path.join(sceneRoot, 'models/house.gltf'),
      JSON.stringify({
        asset: { version: '2.0' },
        images: [{ uri: 'textures/wall.png' }],
        buffers: [{ uri: 'data/house.bin', byteLength: 4 }]
      })
    )
    writeFile(path.join(sceneRoot, 'models/textures/wall.png'), 'WALL')
    writeFile(path.join(sceneRoot, 'models/data/house.bin'), 'BIN')

    engine = Engine()
    const GltfContainer = components.GltfContainer(engine)
    GltfContainer.create(engine.addEntity(), { src: 'models/house.gltf' })

    logger = makeLogger()
    migrate = () => migrateAssets({ fs: createFsComponent(), logger } as any, makeProject(sceneRoot), engine as any)
  })

  afterEach(() => {
    rmSync(sceneRoot, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('should finish the migration instead of throwing', async () => {
    await expect(migrate()).resolves.toEqual(expect.any(Number))
  })

  it('should copy the texture into the model folder', async () => {
    await migrate()

    expect(existsSync(path.join(sceneRoot, 'assets/scene/Models/house/textures/wall.png'))).toBe(true)
  })

  it('should copy the buffer into the model folder', async () => {
    await migrate()

    expect(existsSync(path.join(sceneRoot, 'assets/scene/Models/house/data/house.bin'))).toBe(true)
  })
})
