import path from 'path'
import {
  createEditorWriteTracker,
  EDITOR_WRITE_TTL_MS
} from '../../../packages/@dcl/sdk-commands/src/logic/editor-write-tracker'

const project = path.resolve('/scene')
const composite = path.join(project, 'assets/scene/main.composite')
const entityNames = path.join(project, 'assets/scene/entity-names.ts')
const source = path.join(project, 'src/index.ts')
const outputs = [path.join(project, 'bin/index.js'), path.join(project, 'main.crdt')]

describe('editor write tracker', () => {
  test('a path nobody marked is not an editor write', () => {
    const tracker = createEditorWriteTracker()
    expect(tracker.isEditorWrite(composite)).toBe(false)
  })

  test('a marked path is an editor write, also through a non-normalized spelling', () => {
    const tracker = createEditorWriteTracker()
    tracker.markEditorWrite(composite)
    expect(tracker.isEditorWrite(composite)).toBe(true)
    expect(tracker.isEditorWrite(path.join(project, 'assets/./scene/main.composite'))).toBe(true)
  })

  test('a removed directory covers the files under it, but not a sibling with the same prefix', () => {
    const tracker = createEditorWriteTracker()
    tracker.markEditorWrite(path.join(project, 'assets/models'))
    expect(tracker.isEditorWrite(path.join(project, 'assets/models/tree.glb'))).toBe(true)
    expect(tracker.isEditorWrite(path.join(project, 'assets/models-old/tree.glb'))).toBe(false)
  })

  test('a mark expires after the TTL so a later hand edit is reported again', () => {
    let clock = 1000
    const tracker = createEditorWriteTracker({ now: () => clock })
    tracker.markEditorWrite(composite)
    clock += EDITOR_WRITE_TTL_MS - 1
    expect(tracker.isEditorWrite(composite)).toBe(true)
    clock += 1
    expect(tracker.isEditorWrite(composite)).toBe(false)
  })

  test('the TTL is configurable', () => {
    let clock = 0
    const tracker = createEditorWriteTracker({ ttlMs: 5, now: () => clock })
    tracker.markEditorWrite(composite)
    clock = 5
    expect(tracker.isEditorWrite(composite)).toBe(false)
  })

  describe('rebuild outputs', () => {
    test('inherit the editor origin when every trigger was an editor write (an autosave)', () => {
      const tracker = createEditorWriteTracker()
      tracker.markEditorWrite(composite)
      tracker.markEditorWrite(entityNames)
      tracker.markRebuildOutputs([composite, entityNames], outputs)
      for (const output of outputs) expect(tracker.isEditorWrite(output)).toBe(true)
    })

    test('are a code change when any trigger was not an editor write (an IDE save)', () => {
      const tracker = createEditorWriteTracker()
      tracker.markEditorWrite(composite)
      tracker.markRebuildOutputs([composite, source], outputs)
      for (const output of outputs) expect(tracker.isEditorWrite(output)).toBe(false)
    })

    test('a code change clears an earlier editor mark on the same outputs', () => {
      const tracker = createEditorWriteTracker()
      tracker.markEditorWrite(composite)
      tracker.markRebuildOutputs([composite], outputs)
      tracker.markRebuildOutputs([source], outputs)
      for (const output of outputs) expect(tracker.isEditorWrite(output)).toBe(false)
    })

    test('a rebuild with no recorded trigger is treated as a code change', () => {
      const tracker = createEditorWriteTracker()
      tracker.markRebuildOutputs([], outputs)
      for (const output of outputs) expect(tracker.isEditorWrite(output)).toBe(false)
    })
  })
})
