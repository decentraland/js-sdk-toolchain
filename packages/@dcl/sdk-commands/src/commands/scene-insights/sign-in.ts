import future from 'fp-future'
import { AuthChain, Authenticator } from '@dcl/crypto'
import { Router } from '@well-known-components/http-server'

import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
import { setRoutes, LinkerResponse } from '../../linker-dapp/routes'
import { dAppOptions, runDapp } from '../../run-dapp'
import {
  InsightsSession,
  SESSION_MINUTES,
  INSIGHTS_SERVICE,
  getInsightsSessionMessage,
  createEphemeralIdentity,
  createSessionFromChain,
  createSessionFromPrivateKey,
  delegationFromLinkerChain
} from './session'
import { assertSessionFileIsNotDeployed, loadSession, saveSession } from './session-store'

/** What the linker dApp shows while signing. */
export interface SignInLabel {
  label: string
  world?: string
  parcel?: string
}

export interface SessionOptions {
  /** Where the session is saved */
  file: string
  /** The service URL, shown in the linker dApp */
  targetUrl: string
  linkOptions: Omit<dAppOptions, 'uri'>
  /** Whether a person can answer the browser prompt; without one, a missing session is an error */
  interactive: boolean
  /** Sign a new session even when a saved one is still valid (`login`) */
  forceNew?: boolean
}

export type SessionSource = 'private-key' | 'saved' | 'signed'

/**
 * Gets a session to sign requests with, in order:
 * 1. `DCL_PRIVATE_KEY`, signed locally and never saved;
 * 2. the saved session, while it is valid (unless `forceNew`);
 * 3. a new browser signature through the linker dApp, which is then saved.
 *
 * @throws CliError `SCENE_INSIGHTS_SESSION_REQUIRED` when it would have to open the browser but
 *   nobody is there to sign (an agent or script): `scene-insights login` has to be run first.
 * @throws CliError `SCENE_INSIGHTS_UNSAFE_SESSION_FILE` when a deploy would upload the session
 *   file, before asking for a signature.
 */
export async function getSession(
  components: Pick<CliComponents, 'fs' | 'logger' | 'fetch' | 'config'>,
  label: SignInLabel,
  options: SessionOptions
): Promise<{ session: InsightsSession; source: SessionSource }> {
  if (process.env.DCL_PRIVATE_KEY) {
    return { session: createSessionFromPrivateKey(process.env.DCL_PRIVATE_KEY), source: 'private-key' }
  }

  if (!options.forceNew) {
    const saved = await loadSession(components, options.file)
    if (saved) return { session: saved.session, source: 'saved' }

    if (!options.interactive) {
      throw new CliError(
        'SCENE_INSIGHTS_SESSION_REQUIRED',
        'No signed-in session. Ask the user to run "sdk-commands scene-insights login" (it opens the browser to sign once, for 12 hours), or set DCL_PRIVATE_KEY'
      )
    }
  }

  // before the browser opens: nobody should sign a session that can't be saved
  await assertSessionFileIsNotDeployed(components, options.file)

  const ephemeralIdentity = createEphemeralIdentity()
  const expiration = new Date(Date.now() + SESSION_MINUTES * 60 * 1000)
  const message = getInsightsSessionMessage(ephemeralIdentity.address, expiration)

  const signed = future<AuthChain>()
  const { router: commonRouter } = setRoutes(components, {
    rootCID: message,
    baseParcel: label.parcel ?? '0,0',
    parcels: [label.parcel ?? '0,0'],
    skipValidations: true,
    debug: !!process.env.DEBUG,
    isWorld: !!label.world,
    world: label.label,
    targetUrl: options.targetUrl,
    action: 'view-logs'
  })
  const router = setSignInRoutes(commonRouter, ephemeralIdentity.address, message, (chain) => signed.resolve(chain))

  components.logger.info(
    `Sign read-only access to logs, metrics and executions for the next ${SESSION_MINUTES / 60} hours`
  )
  components.logger.info(
    'This credential works across Insights environments sharing the insights service identifier, including .org and .zone.'
  )
  const { program } = await runDapp(components, router, { ...options.linkOptions, uri: '/' })

  let authChain: AuthChain
  try {
    authChain = await signed
  } finally {
    void program.stop()
  }

  const validated = await Authenticator.validateSignature(
    ephemeralIdentity.address.toLowerCase(),
    authChain,
    null,
    Date.now(),
    { service: INSIGHTS_SERVICE }
  )
  if (!validated.ok || !validated.scope) {
    throw new CliError('SCENE_INSIGHTS_INVALID_SIGNATURE', 'The wallet did not return a valid scoped insights login')
  }
  expiration.setTime(Math.min(expiration.getTime(), validated.scope.expiration))
  await saveSession(components, options.file, ephemeralIdentity, expiration, authChain)
  return { session: createSessionFromChain(ephemeralIdentity, expiration, authChain), source: 'signed' }
}

/** The linker dApp posts `view-logs` signatures to `/api/logs`. */
function setSignInRoutes(
  router: Router<object>,
  ephemeralAddress: string,
  message: string,
  onSigned: (delegation: AuthChain) => void
): Router<object> {
  router.post('/api/logs', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse
    try {
      if (!value.address || !Array.isArray(value.authChain)) {
        throw new CliError('SCENE_INSIGHTS_INVALID_SIGNATURE', 'The wallet did not sign the insights session')
      }
      const delegation = await delegationFromLinkerChain(value.authChain, ephemeralAddress, message)
      // answer the dApp before its server is stopped
      setTimeout(() => onSigned(delegation), 100)
      return { body: { success: true } }
    } catch (e) {
      return { status: 400, body: { success: false, error: (e as Error).message } }
    }
  })
  return router
}
