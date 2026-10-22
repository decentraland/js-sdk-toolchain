import type * as Ecs from '../../packages/@dcl/ecs/src'
import type { PBTouchScreenControls } from '../../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt'
import { readMessage } from '../../packages/@dcl/ecs/src/serialization/crdt/message'
import type { CrdtMessage } from '../../packages/@dcl/ecs/src/serialization/crdt/types'

type Sdk = typeof import('../../packages/@dcl/sdk/src/index')

describe('SDK onStart default on-screen buttons', () => {
  let ecs: typeof Ecs
  let sdk: Sdk
  let crdtGetState: jest.Mock
  let sentToRenderer: Uint8Array[]
  let mainComposite: object | null

  function hiddenActions(): Ecs.InputAction[] {
    const value = ecs.TouchScreenControls.getOrNull(ecs.engine.RootEntity)
    return (value?.touchInputs ?? []).filter((input) => input.hide).map((input) => input.inputAction)
  }

  function touchScreenControlsPut(value: PBTouchScreenControls): Uint8Array {
    const data = new ReadWriteByteBuffer()
    ecs.TouchScreenControls.schema.serialize(value, data)
    const message = new ReadWriteByteBuffer()
    PutComponentOperation.write(ecs.engine.RootEntity, 1, ecs.TouchScreenControls.componentId, data.toBinary(), message)
    return message.toCopiedBinary()
  }

  function sentTouchScreenControls(): CrdtMessage[] {
    const messages: CrdtMessage[] = []
    for (const chunk of sentToRenderer) {
      const buffer = new ReadWriteByteBuffer(chunk)
      let message: CrdtMessage | null
      while ((message = readMessage(buffer))) {
        if ((message as { componentId?: number }).componentId === ecs.TouchScreenControls.componentId) {
          messages.push(message)
        }
      }
    }
    return messages
  }

  beforeEach(() => {
    sentToRenderer = []
    mainComposite = null
    crdtGetState = jest.fn().mockResolvedValue({ hasEntities: false, data: [] })

    jest.resetModules()
    jest.doMock('@dcl/ecs', () => jest.requireActual('../../packages/@dcl/ecs/src'), { virtual: true })
    jest.doMock(
      '@dcl/ecs/dist/components/component-number',
      () => jest.requireActual('../../packages/@dcl/ecs/src/components/component-number'),
      { virtual: true }
    )
    jest.doMock(
      '~system/EngineApi',
      () => ({
        crdtGetState,
        crdtSendToRenderer: jest.fn(async ({ data }: { data: Uint8Array }) => {
          sentToRenderer.push(data)
          return { data: [] }
        }),
        sendBatch: jest.fn()
      }),
      { virtual: true }
    )
    jest.doMock('../../packages/@dcl/sdk/src/observables', () => ({ pollEvents: jest.fn() }))
    jest.doMock('../../packages/@dcl/sdk/src/composite-provider', () => ({
      compositeProvider: { getCompositeOrNull: () => mainComposite }
    }))

    jest.isolateModules(() => {
      ecs = jest.requireMock('@dcl/ecs')
      sdk = jest.requireActual('../../packages/@dcl/sdk/src/index')
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.resetModules()
  })

  describe('when the scene has not set TouchScreenControls', () => {
    it('should hide the secondary and action 3-6 buttons and send them on the first update', async () => {
      await sdk.onStart()

      expect(hiddenActions()).toEqual([
        ecs.InputAction.IA_SECONDARY,
        ecs.InputAction.IA_ACTION_3,
        ecs.InputAction.IA_ACTION_4,
        ecs.InputAction.IA_ACTION_5,
        ecs.InputAction.IA_ACTION_6
      ])

      await sdk.onUpdate(0)

      expect(sentTouchScreenControls().length).toBe(1)
    })
  })

  describe('when the scene set TouchScreenControls while its module was evaluated', () => {
    it('should keep the scene value', async () => {
      ecs.TouchScreenControls.hide([ecs.InputAction.IA_JUMP])

      await sdk.onStart()

      expect(hiddenActions()).toEqual([ecs.InputAction.IA_JUMP])
    })
  })

  describe('when the scene only set non-button fields while its module was evaluated', () => {
    it('should apply the default and keep the joystick setting after hideJoystick()', async () => {
      ecs.TouchScreenControls.hideJoystick()

      await sdk.onStart()

      expect(hiddenActions().length).toBe(5)
      expect(ecs.TouchScreenControls.getOrNull(ecs.engine.RootEntity)?.hideJoystick).toBe(true)
    })

    it('should apply the default and keep the main action after setMainAction()', async () => {
      ecs.TouchScreenControls.setMainAction(ecs.InputAction.IA_ACTION_3)

      await sdk.onStart()

      expect(hiddenActions().length).toBe(5)
      expect(ecs.TouchScreenControls.getOrNull(ecs.engine.RootEntity)?.mainAction).toBe(ecs.InputAction.IA_ACTION_3)
    })
  })

  describe('when the scene called showAll() while its module was evaluated', () => {
    it('should keep every button visible', async () => {
      ecs.TouchScreenControls.showAll()

      await sdk.onStart()

      expect(hiddenActions()).toEqual([])
    })
  })

  describe('when main.composite only sets non-button fields', () => {
    it('should apply the default and keep the composite fields', async () => {
      mainComposite = {}
      jest.spyOn(ecs.Composite, 'instance').mockImplementation(() => {
        ecs.TouchScreenControls.createOrReplace(ecs.engine.RootEntity, {
          touchInputs: [],
          hideJoystick: true,
          hideCrosshair: false
        })
      })

      await sdk.onStart()

      expect(hiddenActions().length).toBe(5)
      expect(ecs.TouchScreenControls.getOrNull(ecs.engine.RootEntity)?.hideJoystick).toBe(true)
    })
  })

  describe('when main.composite sets TouchScreenControls', () => {
    it('should keep the composite value', async () => {
      mainComposite = {}
      jest.spyOn(ecs.Composite, 'instance').mockImplementation(() => {
        ecs.TouchScreenControls.hide([ecs.InputAction.IA_POINTER])
      })

      await sdk.onStart()

      expect(hiddenActions()).toEqual([ecs.InputAction.IA_POINTER])
    })
  })

  describe('when the preloaded state sets TouchScreenControls', () => {
    it('should end with the preloaded value and never send the default', async () => {
      const preloaded: PBTouchScreenControls = {
        touchInputs: [{ inputAction: ecs.InputAction.IA_JUMP, hide: true }],
        hideJoystick: true,
        hideCrosshair: false
      }
      crdtGetState.mockResolvedValue({ hasEntities: true, data: [touchScreenControlsPut(preloaded)] })

      await sdk.onStart()
      await sdk.onUpdate(0)

      expect(ecs.TouchScreenControls.getOrNull(ecs.engine.RootEntity)).toEqual(preloaded)
      expect(sentTouchScreenControls()).toEqual([])
    })
  })

  describe('when the preloaded state does not set TouchScreenControls', () => {
    it('should apply and send the default', async () => {
      crdtGetState.mockResolvedValue({ hasEntities: true, data: [] })

      await sdk.onStart()
      await sdk.onUpdate(0)

      expect(hiddenActions().length).toBe(5)
      expect(sentTouchScreenControls().length).toBe(1)
    })
  })
})
