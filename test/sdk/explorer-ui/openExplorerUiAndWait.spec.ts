import {
  Engine,
  IEngine,
  Schemas,
  components,
  ExplorerUi,
  PBExplorerItemPurchaseResult,
  PBExplorerUiEventsResult
} from '../../../packages/@dcl/ecs/src'
import { AppendValueOperation } from '../../../packages/@dcl/ecs/src/serialization/crdt/appendValue'
import { DeleteEntity } from '../../../packages/@dcl/ecs/src/serialization/crdt/deleteEntity'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { Transport } from '../../../packages/@dcl/ecs/src/systems/crdt/types'
// Type-only: erased at runtime, so it does not evaluate the `~system` mock
// factory before `mockOpenExplorerUi` is initialized.
import type { Channel, CorrelatedEvent, WaitOutcome } from '../../../packages/@dcl/sdk/src/explorer-ui'

// The helper imports from `~system/RestrictedActions`, which jest cannot
// resolve on its own; this virtual mock provides the module and the enum values.
const mockOpenExplorerUi = jest.fn()

jest.mock(
  '~system/RestrictedActions',
  () => ({
    openExplorerUi: mockOpenExplorerUi,
    OpenExplorerUiResult: {
      UNSPECIFIED: 0,
      OPENED: 1,
      WAS_ALREADY_OPEN: 2,
      REJECTED_NOT_CURRENT_SCENE: 3,
      REJECTED_FEATURE_DISABLED: 4,
      REJECTED_NO_USER_GESTURE: 5,
      UNRECOGNIZED: -1
    }
  }),
  { virtual: true }
)

type HelperModule = typeof import('../../../packages/@dcl/sdk/src/explorer-ui')

// Imported lazily so the helper resolves `~system/RestrictedActions` against the mock above.
let create: HelperModule['create']
let channel: HelperModule['channel']
let variant: HelperModule['variant']
let EXPLORER_UI_WAIT_TIMEOUT_SYSTEM: string
let OpenExplorerUiResult: typeof import('~system/RestrictedActions').OpenExplorerUiResult

beforeAll(async () => {
  const mod = await import('../../../packages/@dcl/sdk/src/explorer-ui')
  create = mod.create
  channel = mod.channel
  variant = mod.variant
  EXPLORER_UI_WAIT_TIMEOUT_SYSTEM = mod.EXPLORER_UI_WAIT_TIMEOUT_SYSTEM
  OpenExplorerUiResult = mod.OpenExplorerUiResult
})

type OpenExplorerUiResultType = import('~system/RestrictedActions').OpenExplorerUiResult
type OpenBody = { ui: ExplorerUi; requestId?: number; purchase?: { urn: string } }
type OpenFn = jest.Mock<Promise<{ openResult: OpenExplorerUiResultType }>, [OpenBody]>

/** The wire value that means "this explorer did not echo request_id". */
const UNCORRELATED = 0

/** Lets queued microtasks run: the RPC continuation and the session bookkeeping. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** A component the SDK does not ship, standing in for one added after this release. */
type SyntheticEvent = { timestamp: number; requestId: number; note: string }
const syntheticSchema = Schemas.Map({
  timestamp: Schemas.Int,
  requestId: Schemas.Int,
  note: Schemas.String
})

describe('openExplorerUiAndWait', () => {
  let engine: IEngine
  let transport: Transport
  let openFn: OpenFn
  let ExplorerUiEvents: Channel<'explorerUi', PBExplorerUiEventsResult>
  let ItemPurchase: Channel<'itemPurchase', PBExplorerItemPurchaseResult>
  let Synthetic: Channel<'synthetic', SyntheticEvent>

  beforeEach(() => {
    engine = Engine()
    transport = { send: async () => {}, filter: () => true }
    engine.addTransport(transport)

    ExplorerUiEvents = channel('explorerUi', components.ExplorerUiEventsResult(engine))
    ItemPurchase = channel('itemPurchase', components.ExplorerItemPurchaseResult(engine))
    Synthetic = channel(
      'synthetic',
      engine.defineValueSetComponentFromSchema<SyntheticEvent>('test::Synthetic', syntheticSchema, {
        timestampFunction: (event) => event.timestamp,
        maxElements: 100
      })
    )

    openFn = jest.fn() as OpenFn
    mockOpenExplorerUi.mockReset()
  })

  function makeHelper() {
    return create({ engine, openExplorerUi: openFn, explorerUiEvents: ExplorerUiEvents }).openExplorerUiAndWait
  }

  function opens(verdict: OpenExplorerUiResultType = OpenExplorerUiResult.OPENED) {
    openFn.mockResolvedValue({ openResult: verdict })
  }

  /** The request_id the helper minted for the nth call — the tests never guess it. */
  function mintedId(call = 0): number {
    return openFn.mock.calls[call][0].requestId!
  }

  /** Feed a renderer -> scene APPEND_VALUE for the event, then process it. */
  async function inject<T extends CorrelatedEvent>(ch: Channel<string, T>, event: T, dt = 0) {
    const body = new ReadWriteByteBuffer()
    ch.component.schema.serialize(event, body)
    const message = new ReadWriteByteBuffer()
    AppendValueOperation.write(engine.RootEntity, event.timestamp, ch.component.componentId, body.toBinary(), message)
    transport.onmessage!(message.toBinary())
    await engine.update(dt)
  }

  const uiEvent = (
    ui: ExplorerUi,
    timestamp: number,
    requestId: number,
    $case: 'opened' | 'closed'
  ): PBExplorerUiEventsResult => ({
    ui,
    timestamp,
    requestId,
    event: $case === 'opened' ? { $case: 'opened', opened: {} } : { $case: 'closed', closed: {} }
  })

  const purchaseEvent = (
    urn: string,
    timestamp: number,
    requestId: number,
    $case: 'purchased' | 'dismissed' | 'failed'
  ): PBExplorerItemPurchaseResult => ({
    urn,
    timestamp,
    requestId,
    status:
      $case === 'purchased'
        ? { $case: 'purchased', purchased: {} }
        : $case === 'dismissed'
          ? { $case: 'dismissed', dismissed: {} }
          : { $case: 'failed', failed: {} }
  })

  // The engine has no getSystems; removeSystem returns false when the system
  // is absent. Only call where absence is expected — a true return removes it.
  function timeoutSystemAbsent() {
    return engine.removeSystem(EXPLORER_UI_WAIT_TIMEOUT_SYSTEM) === false
  }

  describe('correlation', () => {
    it('mints a request_id per call, starting at 1 so it never collides with the wire zero', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      void openExplorerUiAndWait(ExplorerUi.EU_MAP)
      void openExplorerUiAndWait(ExplorerUi.EU_PLACES)
      await flush()

      expect(mintedId(0)).toBe(1)
      expect(mintedId(1)).toBe(2)
      expect(mintedId(0)).not.toBe(UNCORRELATED)
    })

    it('forwards the panel and its parameters to the RPC', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      void openExplorerUiAndWait({ ui: ExplorerUi.EU_ITEM_PURCHASE, purchase: { urn: 'urn:decentraland:item' } })
      await flush()

      expect(openFn).toHaveBeenCalledWith({
        ui: ExplorerUi.EU_ITEM_PURCHASE,
        requestId: 1,
        purchase: { urn: 'urn:decentraland:item' }
      })
    })

    it('ignores events carrying another session request_id', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      let settled = false
      const wait = openExplorerUiAndWait(ExplorerUi.EU_MAP).then((outcome) => {
        settled = true
        return outcome
      })
      await flush()

      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 10, mintedId() + 99, 'closed'))
      expect(settled).toBe(false)

      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 11, mintedId(), 'closed'))
      expect((await wait).$case).toBe('closed')
    })

    it('keeps two concurrent sessions apart even when their events interleave', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const map = openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { collect: [ExplorerUiEvents] })
      const places = openExplorerUiAndWait({ ui: ExplorerUi.EU_PLACES }, { collect: [ExplorerUiEvents] })
      await flush()

      const mapId = mintedId(0)
      const placesId = mintedId(1)

      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 10, mapId, 'opened'))
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_PLACES, 11, placesId, 'opened'))
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_PLACES, 12, placesId, 'closed'))
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 13, mapId, 'closed'))

      const mapOutcome = await map
      const placesOutcome = await places
      expect(mapOutcome.$case).toBe('closed')
      expect(placesOutcome.$case).toBe('closed')
      expect(mapOutcome.$case === 'closed' && mapOutcome.events.map((e) => e.event.timestamp)).toEqual([10, 13])
      expect(placesOutcome.$case === 'closed' && placesOutcome.events.map((e) => e.event.timestamp)).toEqual([11, 12])
    })

    it('falls back to the ui field for lifecycle events from an explorer that does not echo request_id', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      let settled = false
      const wait = openExplorerUiAndWait(ExplorerUi.EU_MAP).then((outcome) => {
        settled = true
        return outcome
      })
      await flush()

      // Uncorrelated and for a different panel: not ours.
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_PLACES, 10, UNCORRELATED, 'closed'))
      expect(settled).toBe(false)

      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 11, UNCORRELATED, 'closed'))
      expect((await wait).$case).toBe('closed')
    })

    it('rejects an uncorrelated event for a panel that can coexist with another one', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_ITEM_PURCHASE, purchase: { urn: 'urn:x' } })
      await flush()

      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_ITEM_PURCHASE, 10, UNCORRELATED, 'closed'))

      await expect(wait).rejects.toThrow(/does not echo OpenExplorerUiRequest.request_id/)
    })

    it('rejects an uncorrelated event on a channel that carries no second discriminator', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { collect: [Synthetic] })
      await flush()

      await inject(Synthetic, { timestamp: 10, requestId: UNCORRELATED, note: 'orphan' })

      await expect(wait).rejects.toThrow(/'synthetic' event with no request_id/)
    })
  })

  describe('outcomes', () => {
    it('resolves notOpened for every non-OPENED verdict, without arming the timeout system', async () => {
      for (const verdict of [
        OpenExplorerUiResult.WAS_ALREADY_OPEN,
        OpenExplorerUiResult.REJECTED_NOT_CURRENT_SCENE,
        OpenExplorerUiResult.REJECTED_FEATURE_DISABLED,
        OpenExplorerUiResult.REJECTED_NO_USER_GESTURE
      ]) {
        opens(verdict)
        const outcome = await makeHelper()(ExplorerUi.EU_MAP)

        expect(outcome).toEqual({ $case: 'notOpened', openResult: verdict })
        expect(timeoutSystemAbsent()).toBe(true)
      }
    })

    it('resolves closed on the panel close, collecting nothing by default', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait(ExplorerUi.EU_BACKPACK)
      await flush()

      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_BACKPACK, 10, mintedId(), 'opened'))
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_BACKPACK, 11, mintedId(), 'closed'))

      expect(await wait).toEqual({ $case: 'closed', events: [] })
    })

    it('collects the whole chain, the terminating event included', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_BACKPACK }, { collect: [ExplorerUiEvents] })
      await flush()

      const id = mintedId()
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_BACKPACK, 10, id, 'opened'))
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_BACKPACK, 11, id, 'closed'))

      const outcome = await wait
      expect(outcome).toEqual({
        $case: 'closed',
        events: [
          { channel: 'explorerUi', event: uiEvent(ExplorerUi.EU_BACKPACK, 10, id, 'opened') },
          { channel: 'explorerUi', event: uiEvent(ExplorerUi.EU_BACKPACK, 11, id, 'closed') }
        ]
      })
    })

    it('stops early on `until`, leaving the panel open, and ignores the session afterwards', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait(
        { ui: ExplorerUi.EU_MAP },
        { collect: [ExplorerUiEvents], until: variant(ExplorerUiEvents, 'opened') }
      )
      await flush()

      const id = mintedId()
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 10, id, 'opened'))

      const outcome = await wait
      expect(outcome.$case).toBe('matched')
      expect(outcome.$case === 'matched' && outcome.events).toEqual([
        { channel: 'explorerUi', event: uiEvent(ExplorerUi.EU_MAP, 10, id, 'opened') }
      ])

      // The session is retired: the later close must not settle anything again.
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 11, id, 'closed'))
    })

    it('accepts an `until` on a channel that is not collected, and then collects nothing', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { until: variant(ExplorerUiEvents, 'opened') })
      await flush()

      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 10, mintedId(), 'opened'))

      expect(await wait).toEqual({ $case: 'matched', events: [] })
    })

    it('lets the close win over an `until` that would match the same event', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      // `until` names the whole lifecycle channel, so the close matches both rules.
      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { until: ExplorerUiEvents })
      await flush()

      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 10, mintedId(), 'closed'))

      expect((await wait).$case).toBe('closed')
    })

    it('resolves timedOut with whatever was collected, then removes the timeout system', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      let settled: WaitOutcome<[Channel<'explorerUi', PBExplorerUiEventsResult>]> | undefined
      const wait = openExplorerUiAndWait(
        { ui: ExplorerUi.EU_SETTINGS },
        { collect: [ExplorerUiEvents], timeoutMs: 1000 }
      ).then((outcome) => {
        settled = outcome
        return outcome
      })
      await flush()

      const id = mintedId()
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_SETTINGS, 10, id, 'opened'))

      await engine.update(0.5)
      expect(settled).toBeUndefined()

      await engine.update(0.6)
      const outcome = await wait

      expect(outcome).toEqual({
        $case: 'timedOut',
        events: [{ channel: 'explorerUi', event: uiEvent(ExplorerUi.EU_SETTINGS, 10, id, 'opened') }]
      })
      expect(timeoutSystemAbsent()).toBe(true)
    })

    it('lets the close win over a timeout that expires in the same tick', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { timeoutMs: 1000 })
      await flush()

      // One update both delivers the close and overshoots the timeout. `update` drains the
      // incoming messages before it runs any system, so the session is already settled by
      // the time the timeout system looks at it.
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 10, mintedId(), 'closed'), 5)

      expect((await wait).$case).toBe('closed')
      expect(timeoutSystemAbsent()).toBe(true)
    })

    it('treats a zero timeout as expiring on the next tick, not as no timeout', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { timeoutMs: 0 })
      await flush()

      await engine.update(0)

      expect((await wait).$case).toBe('timedOut')
      expect(timeoutSystemAbsent()).toBe(true)
    })

    it('propagates an RPC failure as a rejection and retires the session', async () => {
      const rpc = deferred<{ openResult: OpenExplorerUiResultType }>()
      openFn.mockReturnValue(rpc.promise)
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { timeoutMs: 1000 })
      await flush()

      rpc.reject(new Error('rpc exploded'))

      await expect(wait).rejects.toThrow('rpc exploded')
      expect(timeoutSystemAbsent()).toBe(true)
    })
  })

  describe('channels', () => {
    it('collects a chain that spans two components and stops on a variant of the second', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait(
        { ui: ExplorerUi.EU_ITEM_PURCHASE, purchase: { urn: 'urn:item' } },
        { collect: [ExplorerUiEvents, ItemPurchase], until: variant(ItemPurchase, 'purchased') }
      )
      await flush()

      const id = mintedId()
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_ITEM_PURCHASE, 10, id, 'opened'))
      await inject(ItemPurchase, purchaseEvent('urn:item', 11, id, 'purchased'))

      const outcome = await wait
      expect(outcome.$case).toBe('matched')
      expect(outcome.$case === 'matched' && outcome.events.map((e) => e.channel)).toEqual([
        'explorerUi',
        'itemPurchase'
      ])
    })

    it('runs the purchase chain to its natural close when no `until` is given', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait(
        { ui: ExplorerUi.EU_ITEM_PURCHASE, purchase: { urn: 'urn:item' } },
        { collect: [ExplorerUiEvents, ItemPurchase] }
      )
      await flush()

      const id = mintedId()
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_ITEM_PURCHASE, 10, id, 'opened'))
      await inject(ItemPurchase, purchaseEvent('urn:item', 11, id, 'purchased'))
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_ITEM_PURCHASE, 12, id, 'closed'))

      const outcome = await wait
      expect(outcome.$case).toBe('closed')
      expect(outcome.$case === 'closed' && outcome.events.map((e) => e.channel)).toEqual([
        'explorerUi',
        'itemPurchase',
        'explorerUi'
      ])
    })

    it('works with a component the SDK does not ship, wrapped by channel()', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { collect: [Synthetic], until: Synthetic })
      await flush()

      const id = mintedId()
      await inject(Synthetic, { timestamp: 10, requestId: id, note: 'hello' })

      expect(await wait).toEqual({
        $case: 'matched',
        events: [{ channel: 'synthetic', event: { timestamp: 10, requestId: id, note: 'hello' } }]
      })
    })

    it('treats a second wrapper around the same component as the same channel', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      // A scene that re-wraps a component the SDK already exports must not get the event twice,
      // and the close must still be recognised as the terminal.
      const rewrapped = channel('explorerUi', ExplorerUiEvents.component)
      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { collect: [rewrapped] })
      await flush()

      const id = mintedId()
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 10, id, 'opened'))
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_MAP, 11, id, 'closed'))

      const outcome = await wait
      expect(outcome.$case).toBe('closed')
      expect(outcome.$case === 'closed' && outcome.events.map((e) => e.event.timestamp)).toEqual([10, 11])
    })

    it('refuses to bind one channel name to two different components', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      const impostor = channel('explorerUi', Synthetic.component)

      await expect(openExplorerUiAndWait({ ui: ExplorerUi.EU_MAP }, { collect: [impostor] })).rejects.toThrow(
        /'explorerUi' is already bound to a different component/
      )
    })

    it('captures events that land while the RPC is still in flight', async () => {
      const rpc = deferred<{ openResult: OpenExplorerUiResultType }>()
      openFn.mockReturnValue(rpc.promise)
      const openExplorerUiAndWait = makeHelper()

      const wait = openExplorerUiAndWait({ ui: ExplorerUi.EU_PLACES }, { collect: [ExplorerUiEvents] })
      await flush()

      // The session is armed before the RPC resolves, which is what removes the need
      // to replay the accumulated value set once it does.
      const id = mintedId()
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_PLACES, 10, id, 'opened'))
      await inject(ExplorerUiEvents, uiEvent(ExplorerUi.EU_PLACES, 11, id, 'closed'))

      rpc.resolve({ openResult: OpenExplorerUiResult.OPENED })

      const outcome = await wait
      expect(outcome.$case).toBe('closed')
      expect(outcome.$case === 'closed' && outcome.events.map((e) => e.event.timestamp)).toEqual([10, 11])
    })

    it('ignores the undefined value delivered to onChange on DELETE_ENTITY', async () => {
      opens()
      const openExplorerUiAndWait = makeHelper()

      let settled = false
      void openExplorerUiAndWait(ExplorerUi.EU_MAP).then(() => (settled = true))
      await flush()

      // A DELETE_ENTITY for the root fires every component's onChange with `undefined`.
      const message = new ReadWriteByteBuffer()
      DeleteEntity.write(engine.RootEntity, message)
      transport.onmessage!(message.toBinary())
      await engine.update(0)

      expect(settled).toBe(false)
    })
  })
})
