import { Composite, OnChangeFunction, Schemas, Name, Transform } from '@dcl/ecs'
import { initRpcMethods } from './rpc-methods'
import { createEngineContext } from './utils/engine'
import { feededFileSystem } from '../client/feeded-local-fs'
import { dumpEngineToComposite } from './utils/engine-to-composite'
import { getCurrentCompositePath } from './fs-utils'

async function mockedRpcInit() {
  const callbackFunctions: OnChangeFunction[] = []
  const fs = await feededFileSystem()
  const engineContext = createEngineContext({
    onChangeFunction: (entity, operation, component, componentValue) => {
      callbackFunctions.forEach((func) => func(entity, operation, component, componentValue))
    }
  })
  const engine = engineContext.engine
  return { fs, engine, callbackFunctions }
}

describe('Init RPC Methods', () => {
  const originalError = console.error
  const originalFetch = globalThis.fetch
  beforeEach(async () => {
    console.error = () => {}
    ;(globalThis as any).fetch = () => {
      throw new Error('Fetch is mocked inside the tests')
    }
  })
  afterAll(() => {
    console.error = originalError
    ;(globalThis as any).fetch = originalFetch
  })

  it('should return default inspector preferences', async () => {
    const mocked = await mockedRpcInit()
    const methods = await initRpcMethods(mocked.fs, mocked.engine, mocked.callbackFunctions)
    expect(await methods.getInspectorPreferences({}, {} as any)).toMatchObject({
      freeCameraInvertRotation: false,
      autosaveEnabled: true
    })
  })

  it('should create a legacy entity node and create the Name component instead', async () => {
    const mocked = await mockedRpcInit()
    const tempContext = createEngineContext()

    const LegacyEntityNode = tempContext.engine.defineComponent('inspector::EntityNode', {
      label: Schemas.String,
      parent: Schemas.Number
    })
    const entity = tempContext.engine.addEntity()
    LegacyEntityNode.create(entity, { label: 'Boedo', parent: 10 })
    const composite = dumpEngineToComposite(tempContext.engine, 'json')
    const jsonComposite = Composite.toJson(composite)
    const compositeDest = getCurrentCompositePath()
    await mocked.fs.writeFile(compositeDest, Buffer.from(JSON.stringify(jsonComposite), 'utf-8'))
    await initRpcMethods(mocked.fs, mocked.engine, mocked.callbackFunctions)

    const EntityNodeComponent = mocked.engine.getComponentOrNull('inspector::EntityNode')
    expect(EntityNodeComponent?.get(entity)).toMatchObject({ label: 'Boedo', parent: 10 })
    await mocked.engine.update(1)

    const NameComponent = mocked.engine.getComponent(Name.componentId) as typeof Name
    const TransformComponent = mocked.engine.getComponent(Transform.componentId) as typeof Transform
    expect(NameComponent.get(entity)).toMatchObject({ value: 'Boedo' })
    expect(TransformComponent.get(entity).parent).toBe(10)
    expect(mocked.engine.getComponentOrNull('inspector::EntityNode')).toBe(null)

    await mocked.engine.update(1)
  })
})
