import { Entity } from '../../packages/@dcl/ecs/dist'
import { components, Transport } from '../../packages/@dcl/ecs/src'
import { Button, Dropdown, Input, ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'
import { setupEngine } from './utils'

describe('UiDropdown React ECS', () => {
  const { engine, uiRenderer } = setupEngine()
  const UiDropdown = components.UiDropdown(engine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  const transportWatcher: Transport = {
    async send() {},
    filter(message) {
      return !!message
    }
  }
  engine.addTransport(transportWatcher)
  const sendSpy = jest.spyOn(transportWatcher, 'filter')
  const ui = () => (
    <UiEntity uiTransform={{ width: '100', display: 'flex' }} uiText={{ value: 'Some Value' }}>
      <Dropdown
        uiTransform={{
          width: 100,
          position: { top: 1, left: 1, right: 1 },
          margin: '1 2 3 4'
        }}
        emptyLabel="Select your team (BOEDO)"
        options={['BOEDO', 'CASLA', 'SAN LORENZO']}
        color={Color4.Red()}
        textAlign="bottom-center"
        font="sans-serif"
        fontSize={14}
        onChange={(e) => {
          if (e) {
          }
        }}
      />
      <Input onChange={() => {}} />
      <Button value="some value" onMouseDown={() => {}} onMouseUp={() => {}} />
    </UiEntity>
  )

  it('should create components & send PUT components', async () => {
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(sendSpy).toBeCalled()
    expect(UiDropdown.get(uiEntity).selectedIndex).toBe(0)
    expect(UiDropdown.get(uiEntity).disabled).toBe(false)
    expect(UiDropdown.get(uiEntity).options).toStrictEqual(['BOEDO', 'CASLA', 'SAN LORENZO'])
  })
  it('should not send any updates if there were no changes', async () => {
    sendSpy.mockReset()
    await engine.update(1)
    // TODO: remove this when its being handled on the renderer side
    // expect(sendSpy).not.toBeCalled()
    expect(sendSpy).toBeCalledTimes(1)
    sendSpy.mockReset()
    await engine.update(1)
    expect(sendSpy).not.toBeCalled()
  })
})
