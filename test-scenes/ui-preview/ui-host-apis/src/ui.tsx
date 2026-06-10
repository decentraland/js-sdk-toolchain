// Worst-case host-API usage: imports network/players/~system modules AT MODULE
// SCOPE and calls them at import time + in the render path. Validates that the
// preview's real-SDK + ~system stub strategy survives arbitrary scenes.
import { Color4 } from '@dcl/sdk/math'
import { engine, Schemas } from '@dcl/sdk/ecs'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { getPlayer } from '@dcl/sdk/players'
import { isServer, registerMessages, syncEntity } from '@dcl/sdk/network'
import { movePlayerTo } from '~system/RestrictedActions'
import { getRealm } from '~system/Runtime'
import { signedFetch } from '~system/SignedFetch'

// Module-scope host usage (runs at import time)
const messages = registerMessages({
  ping: Schemas.Map({ n: Schemas.Int })
})
const serverFlag = isServer

const status = { realm: 'pending...', fetch: 'pending...', moved: 'no' }

getRealm({})
  .then((r: any) => (status.realm = `getRealm ok (${r?.realmInfo?.realmName ?? 'empty'})`))
  .catch((e: any) => (status.realm = `getRealm ERR: ${e}`))

signedFetch({ url: 'https://example.org', init: { method: 'GET', headers: {} } })
  .then(() => (status.fetch = 'signedFetch ok (stubbed)'))
  .catch((e: any) => (status.fetch = `signedFetch ERR: ${e}`))

movePlayerTo({ newRelativePosition: { x: 1, y: 0, z: 1 } })
  .then(() => (status.moved = 'movePlayerTo ok'))
  .catch(() => (status.moved = 'movePlayerTo ERR'))

// syncEntity must run inside main() per the SDK contract — module scope throws
// "Profile not initialized" even in-world. Guard it and show the result, proving
// the preview surfaces SDK guards instead of silently dying.
let syncResult = 'did not throw'
try {
  const shared = engine.addEntity()
  syncEntity(shared, [])
} catch (e) {
  syncResult = `guarded: ${(e as Error).message.slice(0, 40)}…`
}

const Row = (props: { k: string; v: string }) => (
  <UiEntity uiTransform={{ width: '100%', height: 26, justifyContent: 'space-between' }}>
    <Label value={props.k} fontSize={14} color={Color4.create(0.65, 0.65, 0.75, 1)} />
    <Label value={props.v} fontSize={14} color={Color4.create(0.4, 0.9, 0.6, 1)} />
  </UiEntity>
)

const HostApis = () => {
  const player = getPlayer()
  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      <UiEntity
        uiTransform={{ width: 520, flexDirection: 'column', padding: 18, borderRadius: 14 }}
        uiBackground={{ color: Color4.create(0.09, 0.09, 0.13, 0.95) }}
      >
        <Label value="<b>ui-host-apis</b> — every row must render without crashing" fontSize={17} color={Color4.White()} uiTransform={{ height: 30, width: '100%' }} textAlign="middle-left" />
        <Row k="players.getPlayer()" v={player ? `name=${player.name ?? '?'}` : 'null (mock-free, ok)'} />
        <Row k="network.isServer" v={String(serverFlag)} />
        <Row k="network.registerMessages" v={messages ? 'returned room' : 'undefined'} />
        <Row k="network.syncEntity" v={syncResult} />
        <Row k="~system/Runtime getRealm" v={status.realm} />
        <Row k="~system/SignedFetch" v={status.fetch} />
        <Row k="~system/RestrictedActions" v={status.moved} />
      </UiEntity>
    </UiEntity>
  )
}

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(HostApis)
}
