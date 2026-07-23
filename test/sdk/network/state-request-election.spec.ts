import {
  AUTHORITATIVE_SERVER_ADDRESS,
  MAX_STATE_RESPONDERS,
  shouldAnswerStateRequest,
  shouldRespondToStateRequest
} from '../../../packages/@dcl/sdk/network/utils'

describe('REQ_CRDT_STATE responder election', () => {
  const requester = '0xreq0000000000000000000000000000000000ff'
  const peers = [
    '0xaaa0000000000000000000000000000000000001',
    '0xaaa0000000000000000000000000000000000002',
    '0xaaa0000000000000000000000000000000000003',
    '0xaaa0000000000000000000000000000000000004',
    '0xaaa0000000000000000000000000000000000005',
    '0xaaa0000000000000000000000000000000000006'
  ]

  it('responds when our own address is still unknown', () => {
    expect(shouldRespondToStateRequest(undefined, requester, [...peers, requester])).toBe(true)
  })

  it('never answers our own request', () => {
    expect(shouldRespondToStateRequest(requester, requester, [...peers, requester])).toBe(false)
  })

  it('responds when no other peers are known', () => {
    expect(shouldRespondToStateRequest(peers[0], requester, [])).toBe(true)
    expect(shouldRespondToStateRequest(peers[0], requester, [peers[0], requester])).toBe(true)
  })

  it('responds when the room has up to MAX_STATE_RESPONDERS candidates', () => {
    const known = [peers[0], peers[1], requester]
    expect(shouldRespondToStateRequest(peers[0], requester, known)).toBe(true)
    expect(shouldRespondToStateRequest(peers[1], requester, known)).toBe(true)
  })

  it('elects exactly MAX_STATE_RESPONDERS peers when everybody shares the same view', () => {
    const known = [...peers, requester]
    const responders = peers.filter((peer) => shouldRespondToStateRequest(peer, requester, known))
    expect(responders).toHaveLength(MAX_STATE_RESPONDERS)
  })

  it('is deterministic', () => {
    const known = [...peers, requester]
    for (const peer of peers) {
      expect(shouldRespondToStateRequest(peer, requester, known)).toBe(
        shouldRespondToStateRequest(peer, requester, known)
      )
    }
  })

  it('is case-insensitive on addresses', () => {
    const known = [...peers, requester]
    for (const peer of peers) {
      expect(
        shouldRespondToStateRequest(
          peer.toUpperCase(),
          requester.toUpperCase(),
          known.map(($) => $.toUpperCase())
        )
      ).toBe(shouldRespondToStateRequest(peer, requester, known))
    }
  })

  it('rotates the elected responders across different requesters', () => {
    const everElected = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const otherRequester = `0xreq00000000000000000000000000000000000${i.toString(16)}`
      const known = [...peers, otherRequester]
      for (const peer of peers) {
        if (shouldRespondToStateRequest(peer, otherRequester, known)) {
          everElected.add(peer)
        }
      }
    }
    expect(everElected.size).toBeGreaterThan(MAX_STATE_RESPONDERS)
  })

  it('a peer that knows no other candidates responds even if the rest suppress', () => {
    expect(shouldRespondToStateRequest(peers[0], requester, [requester])).toBe(true)
  })
})

describe('authority-aware state request answering', () => {
  const requester = '0xreq0000000000000000000000000000000000ff'
  const peers = [
    '0xaaa0000000000000000000000000000000000001',
    '0xaaa0000000000000000000000000000000000002',
    '0xaaa0000000000000000000000000000000000003',
    '0xaaa0000000000000000000000000000000000004',
    '0xaaa0000000000000000000000000000000000005',
    '0xaaa0000000000000000000000000000000000006'
  ]
  const known = [...peers, requester]
  const client = (over: Partial<Parameters<typeof shouldAnswerStateRequest>[0]> = {}) => ({
    runsOnServer: false,
    requesterAddress: requester,
    hasSeenAuthoritativeServer: false,
    myAddress: peers[0],
    knownAddresses: known,
    ...over
  })

  it('the authoritative server always answers, even when the election would suppress it', () => {
    for (const myAddress of [...peers, undefined]) {
      expect(shouldAnswerStateRequest(client({ runsOnServer: true, myAddress }))).toBe(true)
    }
  })

  it('the server recovery request is answered by the elected subset, never fully suppressed', () => {
    const answering = peers.filter(($) =>
      shouldAnswerStateRequest(
        client({
          myAddress: $,
          requesterAddress: AUTHORITATIVE_SERVER_ADDRESS,
          hasSeenAuthoritativeServer: true,
          knownAddresses: peers
        })
      )
    )
    expect(answering).toHaveLength(MAX_STATE_RESPONDERS)

    expect(
      shouldAnswerStateRequest(
        client({
          myAddress: peers[0],
          requesterAddress: AUTHORITATIVE_SERVER_ADDRESS,
          hasSeenAuthoritativeServer: true,
          knownAddresses: [peers[0], peers[1]]
        })
      )
    ).toBe(true)
  })

  it('clients never answer another client once the server has been seen', () => {
    for (const myAddress of peers) {
      expect(shouldAnswerStateRequest(client({ myAddress, hasSeenAuthoritativeServer: true }))).toBe(false)
    }
  })

  it('falls back to the peer election while no server has been seen', () => {
    for (const myAddress of peers) {
      expect(shouldAnswerStateRequest(client({ myAddress }))).toBe(
        shouldRespondToStateRequest(myAddress, requester, known)
      )
    }
  })
})
