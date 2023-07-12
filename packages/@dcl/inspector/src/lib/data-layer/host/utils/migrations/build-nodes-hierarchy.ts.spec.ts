import { createTempEngineContext, generateMainComposite, generateMinimalComposite } from '../../../client/feeded-local-fs'
import { buildNodesHierarchy } from './build-nodes-hierarchy'

describe('Migration: Build Node component hierarchy', () => {
  let engineCtx: ReturnType<typeof createTempEngineContext>
  beforeEach(() => {
    engineCtx = createTempEngineContext()
  })
  it('should build same hierarchy as in main composite', () => {
    generateMainComposite(engineCtx) // create entities & components

    const { engine, components } = engineCtx

    const hierarchy = buildNodesHierarchy(engineCtx.engine)
    const expected = components.Nodes.get(engine.RootEntity).value

    expect(hierarchy).toEqual(expected)
  })

  it('should build same hierarchy as in minimal composite', () => {
    generateMinimalComposite(engineCtx) // create entities & components

    const { engine, components } = engineCtx

    const hierarchy = buildNodesHierarchy(engineCtx.engine)
    const expected = components.Nodes.get(engine.RootEntity).value

    expect(hierarchy).toEqual(expected)
  })

  it('should build hierarchy with RootEntity as only node', () => {
    const { engine } = engineCtx
    const hierarchy = buildNodesHierarchy(engineCtx.engine)
    expect(hierarchy).toEqual([{ entity: engine.RootEntity, children: [] }])
  })
})
