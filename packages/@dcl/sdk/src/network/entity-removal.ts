import { Entity, EntityState, IEngine } from '@dcl/ecs'
import { EntityRemovalRequest, EntityRemovalResponse } from './entity-removal-protocol'

/** @public */
export type EntityRemovalResult = {
  readonly entity: Entity
  readonly requestId: number
  readonly status: 'accepted' | 'rejected' | 'timeout'
}

type PendingRemoval = {
  entity: Entity
  request: EntityRemovalRequest
  elapsed: number
  lastSent: number
  accepted: boolean
}

const RETRY_INTERVAL_SECONDS = 1
const TIMEOUT_SECONDS = 10
const MAX_REQUEST_ID = 0xffffffff

/** @internal */
export function createEntityRemovalClient(
  engine: IEngine,
  send: (request: EntityRemovalRequest) => void,
  applyAccepted: (request: EntityRemovalRequest) => void
) {
  const byEntity = new Map<Entity, PendingRemoval>()
  const byRequest = new Map<string, PendingRemoval>()
  const listeners = new Set<(result: EntityRemovalResult) => void>()
  let sessionIdHigh = Math.floor(Math.random() * 0x100000000)
  let sessionIdLow = Math.floor(Math.random() * 0x100000000)
  let nextRequestId = 1

  function key(request: EntityRemovalRequest): string {
    return `${request.sessionIdHigh}:${request.sessionIdLow}:${request.requestId}`
  }

  function remove(pending: PendingRemoval): void {
    byEntity.delete(pending.entity)
    byRequest.delete(key(pending.request))
  }

  function complete(pending: PendingRemoval, status: EntityRemovalResult['status']): void {
    remove(pending)
    const result: EntityRemovalResult = Object.freeze({
      entity: pending.entity,
      requestId: pending.request.requestId,
      status
    })
    for (const listener of Array.from(listeners)) {
      try {
        void Promise.resolve(listener(result)).catch((error) => console.error('Entity removal listener failed', error))
      } catch (error) {
        console.error('Entity removal listener failed', error)
      }
    }
  }

  function request(entity: Entity, network: { networkId: number; entityId: Entity }): void {
    if (byEntity.has(entity)) return
    if (nextRequestId > MAX_REQUEST_ID) {
      sessionIdHigh = Math.floor(Math.random() * 0x100000000)
      sessionIdLow = Math.floor(Math.random() * 0x100000000)
      nextRequestId = 1
    }
    const pending: PendingRemoval = {
      entity,
      request: {
        sessionIdHigh,
        sessionIdLow,
        requestId: nextRequestId++,
        networkId: network.networkId,
        entityId: network.entityId
      },
      elapsed: 0,
      lastSent: -Infinity,
      accepted: false
    }
    byEntity.set(entity, pending)
    byRequest.set(key(pending.request), pending)
  }

  function receive(response: EntityRemovalResponse): void {
    const pending = byRequest.get(key(response))
    if (
      !pending ||
      pending.accepted ||
      pending.request.networkId !== response.networkId ||
      pending.request.entityId !== response.entityId
    )
      return
    if (response.status === 'rejected') {
      complete(pending, 'rejected')
    } else {
      pending.accepted = true
      applyAccepted(pending.request)
    }
  }

  function update(dt: number): void {
    for (const pending of Array.from(byEntity.values())) {
      // This system runs after incoming CRDT deletions have been applied.
      if (engine.getEntityState(pending.entity) === EntityState.Removed) {
        complete(pending, 'accepted')
        continue
      }
      pending.elapsed += dt
      if (pending.elapsed >= TIMEOUT_SECONDS) complete(pending, 'timeout')
    }
  }

  function flush(isServer: boolean | null): void {
    if (isServer === null) return
    for (const pending of Array.from(byEntity.values())) {
      if (isServer) {
        remove(pending)
        engine.removeEntity(pending.entity)
      } else if (!pending.accepted && pending.elapsed - pending.lastSent >= RETRY_INTERVAL_SECONDS) {
        pending.lastSent = pending.elapsed
        send(pending.request)
      }
    }
  }

  function onEntityRemovalResult(listener: (result: EntityRemovalResult) => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return { request, receive, update, flush, onEntityRemovalResult }
}
