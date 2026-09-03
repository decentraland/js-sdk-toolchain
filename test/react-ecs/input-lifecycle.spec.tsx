import { Entity, components } from '../../packages/@dcl/ecs/src'
import { Input, ReactEcs } from '../../packages/@dcl/react-ecs/src'
import { setupEngine, WHOLE_SCREEN } from './utils'

function inputEntity(engine: ReturnType<typeof setupEngine>['engine']) {
  const UiInput = components.UiInput(engine)
  let found: Entity = 0 as Entity
  for (const [entity] of engine.getEntitiesWith(UiInput)) found = entity
  return found
}

describe('when an onChange prop is dropped on the render right after mount', () => {
  let engine: ReturnType<typeof setupEngine>['engine']
  let onChange: jest.Mock
  let entity: Entity

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    onChange = jest.fn()

    let editing = true
    // Omitting the prop entirely, which is what a conditional spread produces.
    setup.uiRenderer.setUiRenderer(() => <Input {...(editing ? { onChange } : {})} />, WHOLE_SCREEN)
    await engine.update(1)

    editing = false
    await engine.update(1)

    entity = inputEntity(engine)
    components.UiInputResult(engine).create(entity, { value: 'typed' })
    await engine.update(1)
  })

  it('should stop calling the handler that is no longer rendered', () => {
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('when an onChange prop is kept', () => {
  let engine: ReturnType<typeof setupEngine>['engine']
  let onChange: jest.Mock

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    onChange = jest.fn()

    setup.uiRenderer.setUiRenderer(() => <Input onChange={onChange} />, WHOLE_SCREEN)
    await engine.update(1)
    await engine.update(1)

    components.UiInputResult(engine).create(inputEntity(engine), { value: 'typed' })
    await engine.update(1)
  })

  it('should call it', () => {
    expect(onChange).toHaveBeenCalledWith('typed')
  })
})

describe('when the scene restores a value the renderer reported earlier', () => {
  let engine: ReturnType<typeof setupEngine>['engine']
  let UiInput: ReturnType<typeof components.UiInput>
  let entity: Entity
  let value: string

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    UiInput = components.UiInput(engine)
    value = ''

    setup.uiRenderer.setUiRenderer(
      () => (
        <Input
          value={value}
          onChange={(typed) => {
            value = typed
          }}
        />
      ),
      WHOLE_SCREEN
    )
    await engine.update(1)

    // The player types, and the renderer reports it.
    entity = inputEntity(engine)
    components.UiInputResult(engine).create(entity, { value: 'gm' })
    await engine.update(1)

    // React re-renders with what it was told, which is the echo the reconciler
    // is right to drop.
    await engine.update(1)

    // The scene clears the field, the way a chat box does after sending.
    value = ''
    await engine.update(1)

    // And then restores what was typed, the way a "repeat last" button does.
    value = 'gm'
    await engine.update(1)
  })

  it('should put the restored value in the field', () => {
    expect(UiInput.get(entity).value).toBe('gm')
  })
})

describe('when React re-renders with the value the renderer just reported', () => {
  let engine: ReturnType<typeof setupEngine>['engine']
  let UiInput: ReturnType<typeof components.UiInput>
  let entity: Entity

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    UiInput = components.UiInput(engine)
    let value = ''

    setup.uiRenderer.setUiRenderer(
      () => (
        <Input
          value={value}
          onChange={(typed) => {
            value = typed
          }}
        />
      ),
      WHOLE_SCREEN
    )
    await engine.update(1)

    entity = inputEntity(engine)
    components.UiInputResult(engine).create(entity, { value: 'gm' })
    await engine.update(1)
    await engine.update(1)
  })

  it('should not write that echo back onto the component', () => {
    expect(UiInput.get(entity).value).toBe('')
  })
})
