import { Entity, IEngine, TransformType, engine } from '@dcl/ecs'
import {
  PlayerIdentityData as definePlayerIdenityData,
  AvatarBase as defineAvatarBase,
  AvatarEquippedData as defineAvatarEquippedData,
  PBAvatarBase,
  PBAvatarEquippedData,
  Transform as defineTransform
} from '@dcl/ecs/dist/components'

export type GetPlayerDataReq = {
  userId: string
}

export type GetPlayerDataRes = {
  /**
   * The avatar entity currently backing this player.
   *
   * Tracking is keyed on the ADDRESS, so this can change without any event: if one entity
   * for an address disappears and another appears within the same tick, the player never
   * left, and no arrival or departure fires even though `entity` now points somewhere else.
   * Re-read it with `getPlayer(userId)` rather than caching it — anything attached to a
   * stale entity is attached to nothing.
   */
  entity: Entity
  /**
   * The raw avatar profile name, or `''` while the profile has not replicated. Use
   * `displayName` for a value that is always renderable.
   */
  name: string
  /**
   * Always-renderable name: the profile name when resolved, otherwise a shortened
   * address. Never empty — prefer this over `name` for anything shown to a player.
   */
  displayName: string
  /**
   * True once a real profile name has been seen for this player. Sticky: a profile that
   * later reports an empty name does not clear it.
   */
  nameResolved: boolean
  isGuest: boolean
  userId: string
  avatar?: PBAvatarBase
  wearables: PBAvatarEquippedData['wearableUrns']
  emotes: PBAvatarEquippedData['emoteUrns']
  position: TransformType['position'] | undefined
  /** `Date.now()` of the tick this player was first seen, or 0 if not tracked yet. */
  joinedAtMs: number
}

/**
 * Last known state of a player, still readable after their entity is gone.
 *
 * Handed to `onLeaveScene` as a second argument, because `getPlayer` reads live ECS data
 * and returns null once the player has left.
 */
export type PlayerSnapshot = Readonly<{
  userId: string
  /** The last raw profile name seen, exactly as `GetPlayerDataRes.name` would have reported it. */
  name: string
  /** Always-renderable name: the resolved profile name, otherwise the shortened address. */
  displayName: string
  nameResolved: boolean
  isGuest: boolean
  joinedAtMs: number
}>

export type PlayerEventOptions = {
  /**
   * Whether to wait for the avatar profile before firing.
   *
   * `true` (default) preserves the historical behaviour: the callback runs once identity
   * **and** an `AvatarBase` component are both present, so `avatar` is set. Note this gates
   * on the component existing, not on the name being usable — `name` can still be `''` or an
   * address echo, so render `displayName` and check `nameResolved`.
   *
   * `false` fires as soon as the player's identity exists — earlier, and also for peers
   * whose profile replicates late or never. `name` may be `''` and `avatar` undefined;
   * render `displayName` instead, and use `onPlayerNameChanged` to react when the profile
   * shows up. This is the threshold an authoritative server wants, since it is the point
   * at which the address becomes usable as a key.
   */
  requireProfile?: boolean
  /**
   * Whether to replay the callback for players who already satisfy the threshold at the
   * moment of subscription. Defaults to `true`.
   *
   * `true` matches the historical behaviour: before the tracker was shared per engine, each
   * `definePlayerHelper` call built a cold tracker whose first tick announced everyone
   * already present. Keeping that as the default means a handler wired after an `await` —
   * loading persisted state, for instance — still sees whoever arrived in the meantime.
   *
   * The replay is unconditional: subscribing from inside another handler still replays every
   * player present at that moment, including the ones being announced on that very tick. The
   * per-tick subscriber snapshot is what keeps this exactly-once — a subscription created
   * mid-delivery receives nothing from the remainder of the pass.
   *
   * Set `false` if you only want players who arrive from now on.
   */
  replayPresent?: boolean
}

export interface IPlayersHelper {
  /**
   * Called once per player when they arrive.
   *
   * By default this waits for the avatar profile component, so `avatar` is set. Pass
   * `{ requireProfile: false }` to be told as soon as the player's identity exists — see
   * {@link PlayerEventOptions} for what each threshold guarantees about the name.
   *
   * By default this also fires once for each player who already satisfies the threshold —
   * see `replayPresent` in {@link PlayerEventOptions}.
   *
   * Do not cache `player.entity` past the callback: the entity backing an address can be
   * replaced without an event (see {@link GetPlayerDataRes.entity}).
   *
   * `async` handlers are supported; a rejection is logged and isolated, never left
   * unhandled, and never stops the other handlers.
   *
   * @returns an unsubscribe function
   *
   * @example
   * ```ts
   * // rendering: wait for the profile, and render displayName (name may be unresolved)
   * onEnterScene((player) => addNameplate(player.userId, player.displayName))
   *
   * // server presence: react as soon as the player exists
   * onEnterScene(async (player) => {
   *   const profile = await store.load(player.userId)
   *   room.send('profile', profile, { to: [player.userId] })
   * }, { requireProfile: false })
   * ```
   */
  onEnterScene(cb: (player: GetPlayerDataRes) => void, options?: PlayerEventOptions): () => void

  /**
   * Called once per player when they go away — mirroring the threshold of the matching
   * {@link onEnterScene}. With the default `requireProfile`, that means either the player
   * left or their avatar profile went away; with `{ requireProfile: false }`, only when
   * their identity is gone.
   *
   * Do not rely on `getPlayer(userId)` here — what it returns depends on which threshold
   * fired. On the identity threshold the entity is gone and it returns null; on the default
   * threshold it can still return a live player, because only the avatar profile went away
   * while the identity is still present. The last known state therefore arrives as the second
   * argument, and is the only reading that is correct in both cases.
   *
   * @returns an unsubscribe function
   */
  onLeaveScene(cb: (userId: string, lastKnown: PlayerSnapshot) => void, options?: PlayerEventOptions): () => void

  /**
   * Called when a player's real profile name first becomes available, and on any later
   * change. Subscribe to this instead of polling `AvatarBase` on a timer.
   *
   * Not called for a name that was already resolved when the player was first seen — that
   * value is already on the arrival payload. It can, however, fire on the *same tick* as a
   * default-threshold `onEnterScene`: a late-arriving profile is both what resolves the name
   * and what satisfies that threshold, so a subscriber to both will be told twice. Identity
   * threshold subscribers need this event, since their arrival payload predates the name.
   *
   * @returns an unsubscribe function
   */
  onPlayerNameChanged(cb: (player: GetPlayerDataRes) => void): () => void

  /**
   * Live data for a player, or null when they are not present. Omit `user` for the local
   * player. Matching is case-insensitive.
   *
   * Present means "identity is here" — a player whose profile has not replicated is still
   * returned, with an empty `name` and `nameResolved: false`, but a usable `userId` and
   * `displayName`. An entity carrying only avatar or wearable data and no identity is not a
   * player and yields null.
   */
  getPlayer(user?: GetPlayerDataReq): GetPlayerDataRes | null

  /**
   * Every player currently present, on the same "identity is here" threshold as
   * {@link getPlayer}, and with the same element shape.
   *
   * On a client this **includes the local player**, whose identity is one of the tracked
   * entities. Filter when you mean "everyone else":
   * `getPlayers().filter((p) => p.entity !== engine.PlayerEntity)`. A headless server has
   * no local avatar, so there it is always just the remote peers.
   */
  getPlayers(): GetPlayerDataRes[]

  /**
   * How many players are present. Deliberately not `getPlayers().length`: it reads the
   * tracked size directly instead of building a payload per player, so it stays cheap for
   * per-frame checks like capacity gates. Counts the local player on a client, same as
   * {@link getPlayers}.
   *
   * Because of that it reflects the last settled tick, while {@link getPlayers} validates
   * against live components — so for one frame after an entity disappears this can read one
   * higher than `getPlayers().length`. Use `getPlayers().length` when you need the two to
   * agree exactly.
   */
  getPlayerCount(): number
}

/** Number of leading address characters used for the name fallback. */
const ADDRESS_FALLBACK_LENGTH = 8

/**
 * Cap for `displayName`. Profile names are short; this only bounds a hostile or corrupt
 * value, since this is the field the API tells scenes to render.
 */
const MAX_DISPLAY_NAME_LENGTH = 64

type TrackedPlayer = {
  userId: string
  entity: Entity
  /** Resolved profile name, or '' while unresolved. Sticky — see `buildPlayerData`. */
  name: string
  /**
   * Last raw `AvatarBase.name` seen, untrimmed. Kept so a departure snapshot reports the
   * same `name` the live payload would have, rather than the trimmed resolved form.
   */
  rawName: string
  nameResolved: boolean
  isGuest: boolean
  joinedAtMs: number
}

type Candidate = {
  key: string
  userId: string
  entity: Entity
  isGuest: boolean
  avatar: PBAvatarBase | null
}

type Subscription<T> = {
  cb: T
  requireProfile: boolean
}

/**
 * A profile name counts as resolved once it is non-empty and is not just the wallet
 * address echoed back. Checking against the address rather than a `0x` prefix matters:
 * `0xSomeName` is a legal claimed name.
 */
function resolveName(name: string | undefined, addressKey: string): string | null {
  if (!name) return null
  const trimmed = name.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase() === addressKey) return null
  return trimmed
}

function shortenAddress(userId: string): string {
  return sanitizeForDisplay(userId.slice(0, ADDRESS_FALLBACK_LENGTH))
}

/**
 * Bound and de-markup a value destined for `displayName`. The client renders scene text as
 * TextMeshPro rich text, so `<...>` is interpreted markup rather than literal text — angle
 * brackets are stripped rather than escaped, because escaping shows up literally in TMP.
 * `name` is left exactly as the profile reported it.
 */
function sanitizeForDisplay(value: string): string {
  return value.replace(/[<>]/g, '').slice(0, MAX_DISPLAY_NAME_LENGTH)
}

/**
 * Run one handler with its failures contained, whether it throws synchronously or returns a
 * promise that rejects later. Handlers are commonly `async` (loading persisted state, for
 * instance) — TypeScript admits those against a `void` return, so an unhandled rejection
 * there would otherwise escape the tracker entirely.
 *
 * Thenables are duck-typed rather than checked with `instanceof Promise`: a transpiled or
 * cross-realm promise is still a promise for our purposes.
 */
function runIsolated(label: string, run: () => unknown): void {
  try {
    const result = run() as { then?: unknown } | null | undefined
    if (result && typeof result.then === 'function') {
      // Promise.resolve() adopts any thenable, so this works for transpiled and
      // cross-realm promises and cannot throw for a thenable that lacks `.catch`.
      void Promise.resolve(result).catch((error) => {
        console.error(`[players] ${label} handler failed:`, error)
      })
    }
  } catch (error) {
    console.error(`[players] ${label} handler failed:`, error)
  }
}

/**
 * Invoke matching callbacks over a snapshot of the list, isolating failures: one failing
 * handler must not skip the others, nor kill the tracking system for the rest of the run.
 */
function emit<T>(subs: Subscription<T>[], requireProfile: boolean, label: string, invoke: (cb: T) => unknown): void {
  for (const sub of [...subs]) {
    if (sub.requireProfile !== requireProfile) continue
    runIsolated(label, () => invoke(sub.cb))
  }
}

function remover<T>(list: Subscription<T>[], sub: Subscription<T>): () => void {
  return () => {
    const index = list.indexOf(sub)
    if (index !== -1) list.splice(index, 1)
  }
}

/**
 * When one address is backed by more than one entity — a peer reconnecting before the old
 * entity is collected — keep the incumbent if it is still present, else pick the most
 * informative: a resolved profile name beats an `AvatarBase` with no usable name, which beats
 * no `AvatarBase` at all. Ties keep the first seen, so the choice is stable across ticks.
 *
 * Deliberately does NOT infer recency from the entity id: ids pack `number | (version << 16)`
 * (see `@dcl/ecs` engine/entity.ts), so comparing them raw orders by version first, and
 * host-assigned avatar slots are pool-recycled with version 0 — a reconnecting peer often
 * lands on a LOWER slot than the stale one.
 */
function rankCandidate(candidate: Candidate, trackedEntity: Entity | undefined): number {
  // Incumbency outranks everything: while the entity we already track is still present, no
  // other entity may claim its address. Identity rows are not authenticated per-entity, so
  // without this a second entity carrying a resolved name could take over a live player's
  // record. A genuine reconnect is unaffected — the old entity is gone, so it is not here to
  // win. See the note on identity trust in the module docs.
  if (trackedEntity !== undefined && candidate.entity === trackedEntity) return 3
  if (resolveName(candidate.avatar?.name, candidate.key) !== null) return 2
  if (candidate.avatar) return 1
  return 0
}

function betterCandidate(a: Candidate, b: Candidate, trackedEntity: Entity | undefined): Candidate {
  return rankCandidate(b, trackedEntity) > rankCandidate(a, trackedEntity) ? b : a
}

function createPlayerHelper(engine: IEngine): IPlayersHelper {
  const Transform = defineTransform(engine)
  const PlayerIdentityData = definePlayerIdenityData(engine)
  const AvatarEquippedData = defineAvatarEquippedData(engine)
  const AvatarBase = defineAvatarBase(engine)

  /** Every player whose identity is present, keyed by lowercased address. */
  const tracked = new Map<string, TrackedPlayer>()
  /** Subset of `tracked` that also has an avatar profile. */
  const withProfile = new Set<string>()

  const enterSubs: Subscription<(player: GetPlayerDataRes) => void>[] = []
  const leaveSubs: Subscription<(userId: string, lastKnown: PlayerSnapshot) => void>[] = []
  const nameChangedSubs: { cb: (player: GetPlayerDataRes) => void }[] = []

  function findEntity(userId?: string): Entity | undefined {
    // Only an ABSENT argument means "the local player". An explicitly empty address is a
    // lookup that must fail, not silently resolve to whoever is running this scene.
    if (userId === undefined) return engine.PlayerEntity
    if (!userId) return undefined
    const key = userId.toLowerCase()
    // The index is only as fresh as the last tick, and CRDT updates land before systems run.
    // Re-read the live component and require the address to STILL match: presence alone is
    // not enough, because the identity on that entity may have been reassigned to another
    // address in the meantime, which would answer this lookup with the wrong player.
    const trackedEntity = tracked.get(key)?.entity
    if (trackedEntity !== undefined && PlayerIdentityData.getOrNull(trackedEntity)?.address?.toLowerCase() === key) {
      return trackedEntity
    }
    // Live scan. Case-insensitive on purpose: addresses reach scenes in mixed casings, and
    // an exact comparison silently returns null for a lowercased address.
    for (const [entity, data] of engine.getEntitiesWith(PlayerIdentityData)) {
      if (data.address?.toLowerCase() === key) return entity
    }
    return undefined
  }

  function buildPlayerData(entity: Entity): GetPlayerDataRes | null {
    const playerData = PlayerIdentityData.getOrNull(entity)
    const avatarData = AvatarBase.getOrNull(entity)
    const wearablesData = AvatarEquippedData.getOrNull(entity)

    // Identity is what makes a player addressable, so it is required: without it there is
    // no `userId` to key on and no basis for the never-empty `displayName`. Avatar and
    // wearables are enrichment only.
    if (!playerData?.address) return null

    const userId = playerData.address
    const entry = tracked.get(userId.toLowerCase())

    // `displayName`/`nameResolved` are STICKY: once a real name has been seen it survives a
    // profile that later reports empty, matching the no-downgrade rule in the tracker.
    // `name`/`avatar` stay the raw live values.
    const position = Transform.getOrNull(entity)?.position
    const liveResolved = resolveName(avatarData?.name, userId.toLowerCase())
    const resolved = liveResolved ?? (entry?.nameResolved ? entry.name : null)

    return {
      entity,
      name: avatarData?.name ?? '',
      displayName: resolved ? sanitizeForDisplay(resolved) : shortenAddress(userId),
      nameResolved: resolved !== null,
      isGuest: !!playerData.isGuest,
      userId,
      avatar: avatarData ?? undefined,
      // Copied, not aliased: `Readonly<>` is a compile-time hint and the component's own
      // freeze is shallow, so handing out the live arrays would let a handler write straight
      // into component data with no dirty-marking.
      wearables: [...(wearablesData?.wearableUrns ?? [])],
      emotes: [...(wearablesData?.emoteUrns ?? [])],
      position: position ? { ...position } : undefined,
      joinedAtMs: entry?.joinedAtMs ?? 0
    }
  }

  /** Payload for a tracked key, or null when its entity no longer carries an identity. */
  function dataForTracked(key: string): GetPlayerDataRes | null {
    const entity = tracked.get(key)?.entity
    if (entity === undefined) return null
    return buildPlayerData(entity)
  }

  function forget(key: string): void {
    tracked.delete(key)
    withProfile.delete(key)
  }

  function getPlayer(user?: GetPlayerDataReq): GetPlayerDataRes | null {
    const userEntity = findEntity(user?.userId)
    if (!userEntity) return null
    return buildPlayerData(userEntity)
  }

  function snapshotOf(player: TrackedPlayer): PlayerSnapshot {
    return {
      userId: player.userId,
      // The raw value, matching `GetPlayerDataRes.name`; `displayName` carries the resolved
      // and sanitized form.
      name: player.rawName,
      displayName: player.nameResolved ? sanitizeForDisplay(player.name) : shortenAddress(player.userId),
      nameResolved: player.nameResolved,
      isGuest: player.isGuest,
      joinedAtMs: player.joinedAtMs
    }
  }

  /**
   * Single per-frame diff feeding both thresholds.
   *
   * Keyed on `PlayerIdentityData` and on the ADDRESS, not on the entity: a reconnect
   * reuses the address with a fresh entity, and the avatar profile is a separate,
   * later-arriving signal. Leaves are detected by absence rather than through an
   * `AvatarBase.onChange` hook, which could never fire for a peer that had no profile and
   * whose per-entity callbacks were never released.
   *
   * Ordering: every state change is applied before any callback runs, so all handlers —
   * arrivals and departures alike — observe the same settled set even when someone joined
   * and someone else left on the same tick. A departure handler reads the player it was
   * told about from its `lastKnown` argument.
   */
  function trackingSystem(): void {
    // Nothing present and nothing tracked: the overwhelmingly common case for a scene that
    // never has players, and this module is bundled into every scene.
    if (tracked.size === 0 && engine.getEntitiesWith(PlayerIdentityData)[Symbol.iterator]().next().done) return

    // Iterated directly: every callback runs after this pass completes, so nothing can
    // mutate the component store mid-iteration and a defensive copy would be pure per-frame
    // waste in a module that is bundled into every scene.
    const present = new Map<string, Candidate>()

    for (const [entity, identity] of engine.getEntitiesWith(PlayerIdentityData)) {
      const userId = identity.address
      if (!userId) continue
      const key = userId.toLowerCase()
      const candidate: Candidate = {
        key,
        userId,
        entity,
        isGuest: !!identity.isGuest,
        avatar: AvatarBase.getOrNull(entity)
      }
      const previous = present.get(key)
      const trackedEntity = tracked.get(key)?.entity
      present.set(key, previous ? betterCandidate(previous, candidate, trackedEntity) : candidate)
    }

    const goneKeys: string[] = []
    const leftWithProfile: TrackedPlayer[] = []
    const leftIdentity: TrackedPlayer[] = []
    const arrivedIdentity: string[] = []
    const arrivedWithProfile: string[] = []
    const renamed: string[] = []

    for (const [key, player] of tracked) {
      if (present.has(key)) continue
      goneKeys.push(key)
      if (withProfile.has(key)) leftWithProfile.push(player)
      leftIdentity.push(player)
    }

    for (const [key, candidate] of present) {
      const resolved = resolveName(candidate.avatar?.name, key)
      let player = tracked.get(key)

      if (!player) {
        player = {
          userId: candidate.userId,
          entity: candidate.entity,
          name: resolved ?? '',
          rawName: candidate.avatar?.name ?? '',
          nameResolved: resolved !== null,
          isGuest: candidate.isGuest,
          joinedAtMs: Date.now()
        }
        tracked.set(key, player)
        arrivedIdentity.push(key)
      } else {
        // `userId` is deliberately NOT refreshed: the address casing can differ between
        // sources, and a scene that keys state on the arrival `userId` must see the same
        // string at departure.
        player.isGuest = candidate.isGuest
        player.rawName = candidate.avatar?.name ?? ''
        if (player.entity !== candidate.entity) {
          // The winning entity changed, so the sticky name belonged to the previous one —
          // do not carry it across.
          player.entity = candidate.entity
          player.name = resolved ?? ''
          player.nameResolved = resolved !== null
          if (resolved !== null) renamed.push(key)
        } else if (resolved !== null && resolved !== player.name) {
          // Only a resolved name may overwrite: a profile that briefly reports empty must
          // not downgrade a resolved name back to the fallback.
          player.name = resolved
          player.nameResolved = true
          renamed.push(key)
        }
      }

      if (candidate.avatar) {
        if (!withProfile.has(key)) {
          withProfile.add(key)
          arrivedWithProfile.push(key)
        }
      } else if (withProfile.delete(key)) {
        leftWithProfile.push(player)
      }
    }

    for (const key of goneKeys) {
      tracked.delete(key)
      withProfile.delete(key)
    }

    const leaveNow = [...leaveSubs]
    for (const player of leftWithProfile) {
      const snapshot = snapshotOf(player)
      emit(leaveNow, true, 'onLeaveScene', (cb) => cb(player.userId, snapshot))
    }
    for (const player of leftIdentity) {
      const snapshot = snapshotOf(player)
      emit(leaveNow, false, 'onLeaveScene', (cb) => cb(player.userId, snapshot))
    }

    // A handler can remove an entity mid-delivery. If the payload can no longer be built,
    // drop the key instead of leaving a tracked player that would later emit a departure it
    // never got an arrival for.
    // Snapshotted once for the whole tick, so every event in this pass goes to the same set
    // of subscribers. Subscribing from inside a handler therefore takes effect from the next
    // tick, and unsubscribing a sibling mid-pass does not retroactively skip it.
    const enterNow = [...enterSubs]
    const nameChangedNow = [...nameChangedSubs]

    for (const key of arrivedIdentity) {
      const data = dataForTracked(key)
      if (data) emit(enterNow, false, 'onEnterScene', (cb) => cb(data))
      else forget(key)
    }
    for (const key of arrivedWithProfile) {
      const data = dataForTracked(key)
      if (data) emit(enterNow, true, 'onEnterScene', (cb) => cb(data))
      else forget(key)
    }
    for (const key of renamed) {
      const data = dataForTracked(key)
      if (!data) continue
      for (const sub of nameChangedNow) {
        runIsolated('onPlayerNameChanged', () => sub.cb(data))
      }
    }
  }

  // Registered eagerly rather than on first subscription: adding a system from inside a
  // running system re-sorts the live system list mid-iteration, which can make a sibling
  // system run twice in that frame.
  engine.addSystem(trackingSystem, undefined, '@dcl/sdk/players')

  return {
    onEnterScene(cb, options) {
      const requireProfile = options?.requireProfile !== false
      const sub: Subscription<typeof cb> = { cb, requireProfile }
      enterSubs.push(sub)
      if (options?.replayPresent !== false) {
        for (const [key, player] of [...tracked]) {
          if (requireProfile && !withProfile.has(key)) continue
          const data = buildPlayerData(player.entity)
          if (!data) continue
          runIsolated('onEnterScene replay', () => cb(data))
        }
      }
      return remover(enterSubs, sub)
    },
    onLeaveScene(cb, options) {
      const sub: Subscription<typeof cb> = { cb, requireProfile: options?.requireProfile !== false }
      leaveSubs.push(sub)
      return remover(leaveSubs, sub)
    },
    onPlayerNameChanged(cb) {
      const sub = { cb }
      nameChangedSubs.push(sub)
      return () => {
        const index = nameChangedSubs.indexOf(sub)
        if (index !== -1) nameChangedSubs.splice(index, 1)
      }
    },
    getPlayer,
    getPlayers() {
      const result: GetPlayerDataRes[] = []
      for (const player of tracked.values()) {
        const data = buildPlayerData(player.entity)
        if (data) result.push(data)
      }
      return result
    },
    getPlayerCount() {
      return tracked.size
    }
  }
}

// One helper — and therefore one tracking system — per engine. Both `@dcl/sdk/players`
// and the network transport ask for it with the global engine; without memoization that
// is two systems scanning the same component every frame.
const helpers = new WeakMap<IEngine, IPlayersHelper>()

export function definePlayerHelper(targetEngine: IEngine): IPlayersHelper {
  const existing = helpers.get(targetEngine)
  if (existing) return existing
  const helper = createPlayerHelper(targetEngine)
  helpers.set(targetEngine, helper)
  return helper
}

const players = definePlayerHelper(engine)
const { getPlayer, onEnterScene, onLeaveScene, onPlayerNameChanged, getPlayers, getPlayerCount } = players

export { getPlayer, onEnterScene, onLeaveScene, onPlayerNameChanged, getPlayers, getPlayerCount }
export default players
