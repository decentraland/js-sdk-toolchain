import path from 'path'
import { mkdirSync, rmSync, writeFileSync } from 'fs'

import * as components from '../../../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../../../packages/@dcl/ecs/src/engine'
import { ReadWriteByteBuffer } from '../../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutComponentOperation } from '../../../../packages/@dcl/ecs/src/serialization/crdt/putComponent'
import { seedCaptureEngine } from '../../../../packages/@dcl/sdk-commands/src/commands/code-to-composite/scene-executor'
import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const WORK_DIR = path.resolve(REPO_ROOT, 'tmp/code-to-composite-seed')

/** An entity number well clear of anything the shared engine allocates itself. */
const PRE_EXISTING_ENTITY = 700 as Entity
const MODEL_SRC = 'models/from-the-inspector.glb'

function makeLogger() {
  return { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}

/**
 * A main.crdt of the shape the Creator Hub writes: one entity carrying components
 * that exist only in that file, never in the scene's own code.
 */
function writeMainCrdt(filePath: string) {
  const source = Engine()
  const Transform = components.Transform(source)
  const GltfContainer = components.GltfContainer(source)

  const transformData = new ReadWriteByteBuffer()
  Transform.schema.serialize(
    {
      position: { x: 8, y: 1, z: 8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      parent: 0 as Entity
    } as any,
    transformData
  )
  const gltfData = new ReadWriteByteBuffer()
  GltfContainer.schema.serialize({ src: MODEL_SRC } as any, gltfData)

  const out = new ReadWriteByteBuffer()
  PutComponentOperation.write(PRE_EXISTING_ENTITY, 1, Transform.componentId, transformData.toBinary(), out)
  PutComponentOperation.write(PRE_EXISTING_ENTITY, 1, GltfContainer.componentId, gltfData.toBinary(), out)

  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, out.toBinary())
}

describe('when the capture engine is seeded from an existing main.crdt', () => {
  let crdtFilePath: string
  let seeded: Awaited<ReturnType<typeof seedCaptureEngine>>

  beforeEach(async () => {
    rmSync(WORK_DIR, { recursive: true, force: true })
    crdtFilePath = path.join(WORK_DIR, 'main.crdt')
    writeMainCrdt(crdtFilePath)

    seeded = await seedCaptureEngine({ fs: createFsComponent(), logger: makeLogger() } as any, crdtFilePath)
  })

  afterEach(() => {
    rmSync(WORK_DIR, { recursive: true, force: true })
  })

  it('should read the file into the state it hands back', () => {
    expect(seeded.crdtState.byteLength).toBeGreaterThan(0)
  })

  it('should keep the entity that existed only in the crdt file', () => {
    const Transform = components.Transform(seeded.engine as any)

    expect(Transform.getOrNull(PRE_EXISTING_ENTITY)).not.toBe(null)
  })

  it('should keep the components that came with it', () => {
    const GltfContainer = components.GltfContainer(seeded.engine as any)

    expect(GltfContainer.getOrNull(PRE_EXISTING_ENTITY)?.src).toBe(MODEL_SRC)
  })
})

describe('when there is no main.crdt to seed from', () => {
  let seeded: Awaited<ReturnType<typeof seedCaptureEngine>>

  beforeEach(async () => {
    rmSync(WORK_DIR, { recursive: true, force: true })

    seeded = await seedCaptureEngine(
      { fs: createFsComponent(), logger: makeLogger() } as any,
      path.join(WORK_DIR, 'missing.crdt')
    )
  })

  it('should hand back an empty state instead of failing', () => {
    expect(seeded.crdtState.byteLength).toBe(0)
  })

  it('should still give back a usable engine', () => {
    expect(typeof seeded.engine.addEntity).toBe('function')
  })
})
