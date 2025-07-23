import { components } from '../../packages/@dcl/ecs/src'
import { Button, Dropdown, Input, ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'
import { setupEngine } from './utils'

describe('UiDropdown React ECS', () => {
  const { engine, uiRenderer } = setupEngine()
  const PointerEvents = components.PointerEvents(engine)

  it('should create components & send PUT components', async () => {
    uiRenderer.setUiRenderer(() => (
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
    ))

    await engine.update(1)

    // after update, there should be only one pointer event per eventType and button
    for (const [_entity, pe] of engine.getEntitiesWith(PointerEvents)) {
      expect(pe).toEqual({
        pointerEvents: [
          { eventType: 1, eventInfo: { button: 0, showFeedback: true } },
          { eventType: 0, eventInfo: { button: 0, showFeedback: true } }
        ]
      })
    }

    // the leak happened after the second update
    await engine.update(1)

    // after update, there should be only one pointer event per eventType and button
    for (const [_entity, pe] of engine.getEntitiesWith(PointerEvents)) {
      expect(pe).toEqual({
        pointerEvents: [
          { eventType: 1, eventInfo: { button: 0, showFeedback: true } },
          { eventType: 0, eventInfo: { button: 0, showFeedback: true } }
        ]
      })
    }
  })
})
