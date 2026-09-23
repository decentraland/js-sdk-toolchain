import {
  webExplorerBaseUrl,
  webExplorerEnvParams,
  engineEnvArgs,
  pulseServerNative,
  lsdDeepLinkPulseParams
} from '../../../../packages/@dcl/sdk-commands/src/commands/start/dcl-env'
import { lsdRealmKey } from '../../../../packages/@dcl/sdk-commands/src/logic/lsd-realm'

const PROJECT_ROOT = '/home/dev/my-scene'

describe('dcl-env', () => {
  it('org (the default) adds no overrides anywhere', () => {
    expect(webExplorerBaseUrl('org')).toBe('https://decentraland.org/bevy-web/')
    expect(webExplorerEnvParams('org')).toBe('')
    expect(engineEnvArgs('org')).toEqual([])
    expect(pulseServerNative('org')).toBeUndefined()
    expect(lsdDeepLinkPulseParams(PROJECT_ROOT, 'org')).toBe(
      `&pulse-realm=${encodeURIComponent(lsdRealmKey(PROJECT_ROOT))}`
    )
  })

  it('zone re-points the whole preview stack, pinning the org-only preview gatekeeper', () => {
    // the zone-hosted page and a --base-domain zone engine derive the zone Pulse server
    // themselves; only the gatekeeper (no zone deployment yet) needs pinning back to org
    expect(webExplorerBaseUrl('zone')).toBe('https://decentraland.zone/bevy-web/')
    expect(webExplorerEnvParams('zone')).toBe(
      `&previewGatekeeper=${encodeURIComponent('https://comms-gatekeeper-local.decentraland.org')}`
    )
    expect(engineEnvArgs('zone')).toEqual([
      '--base-domain=decentraland.zone',
      '--preview-gatekeeper=https://comms-gatekeeper-local.decentraland.org'
    ])
    // deep-linked native clients have no zone base domain, so their endpoint is stated
    expect(pulseServerNative('zone')).toBe('pulse-server.decentraland.zone:7777')
    expect(lsdDeepLinkPulseParams(PROJECT_ROOT, 'zone')).toBe(
      `&pulse-realm=${encodeURIComponent(lsdRealmKey(PROJECT_ROOT))}` +
        '&pulse-server=pulse-server.decentraland.zone:7777'
    )
  })

  it('bevy-web exists on org and zone only, so other envs fall back to org', () => {
    expect(webExplorerBaseUrl('today')).toBe('https://decentraland.org/bevy-web/')
    expect(webExplorerEnvParams('today')).toBe('')
    expect(engineEnvArgs('today')).toEqual([])
    expect(pulseServerNative('today')).toBeUndefined()
  })
})
