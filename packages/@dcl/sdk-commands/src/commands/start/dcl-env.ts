// Everything `--dclenv` selects for the preview lives here. The default (org) needs no
// overrides. Zone runs its OWN Pulse server with identical realm names, so a zone preview
// must land every party on it: the zone-hosted web client and a --base-domain zone engine
// derive `pulse-server.decentraland.zone` themselves (bevy-explorer#1224); only parties
// with no zone base domain — native clients launched by deep link — need it stated.
import { lsdRealmKey } from '../../logic/lsd-realm'

export function webExplorerBaseUrl(dclenv: string): string {
  // bevy-web is deployed on decentraland.org and decentraland.zone only; the zone page
  // resolves its base domain from its own host, which re-points its Pulse fallback too
  return `https://decentraland.${dclenv === 'zone' ? 'zone' : 'org'}/bevy-web/`
}

// TEMPORARY: the preview gatekeeper has no zone deployment yet, so zone launches pin that
// one service back to org — server and web client alike — or scene-room minting fails.
// Drop both pins once comms-gatekeeper-local is deployed on zone.
const ORG_PREVIEW_GATEKEEPER = 'https://comms-gatekeeper-local.decentraland.org'

/** Extra query params for the web client under a non-default environment. */
export function webExplorerEnvParams(dclenv: string): string {
  if (dclenv !== 'zone') return ''
  return `&previewGatekeeper=${encodeURIComponent(ORG_PREVIEW_GATEKEEPER)}`
}

/**
 * Environment args for the locally-spawned engine. `--base-domain` re-points every backend
 * host the engine composes, Pulse included; the gatekeeper pin is the temporary exception.
 */
export function engineEnvArgs(dclenv: string): string[] {
  if (dclenv !== 'zone') return []
  return ['--base-domain=decentraland.zone', `--preview-gatekeeper=${ORG_PREVIEW_GATEKEEPER}`]
}

/** Pulse endpoint for deep-linked native clients (ENet); undefined = the client's default. */
export function pulseServerNative(dclenv: string): string | undefined {
  return dclenv === 'zone' ? 'pulse-server.decentraland.zone:7777' : undefined
}

/**
 * Pulse params for the mobile preview deep link: the LSD realm key — stated explicitly so a
 * phone-side explorer can join the partition without re-deriving it — plus the environment's
 * Pulse endpoint when it is not the production default.
 */
export function lsdDeepLinkPulseParams(projectRoot: string, dclenv: string): string {
  const server = pulseServerNative(dclenv)
  return `&pulse-realm=${encodeURIComponent(lsdRealmKey(projectRoot))}` + (server ? `&pulse-server=${server}` : '')
}
