import { IsServerRequest, IsServerResponse } from '~system/EngineApi'
import { Atom } from '../atom'

/**
 * Per-transport runtime state. Built once per `addSyncTransport` rather than at
 * module scope on purpose: several transports (each with its own `isServerFn`)
 * coexist in one process in the tests, and they must not share a role.
 */
export type RuntimeContext = {
  isServerAtom: Atom<boolean>
  isRoomReadyAtom: Atom<boolean>
}

export function createRuntimeContext(
  isServerFn: (request: IsServerRequest) => Promise<IsServerResponse>
): RuntimeContext {
  const isServerAtom = Atom<boolean>()
  const isRoomReadyAtom = Atom<boolean>(false)

  void isServerFn({}).then(($: IsServerResponse) => isServerAtom.swap(!!$.isServer))

  return { isServerAtom, isRoomReadyAtom }
}
