import { CliComponents } from '../../components'
import { LinkerResponse } from '../../linker-dapp/routes'
import { CliError, CliErrorName } from '../../logic/error'
import { createDeploymentState, DeploymentResult, IDeploymentStateComponent } from './state'

export type DeployContext = {
  signal: AbortSignal
  state: IDeploymentStateComponent
  /**
   * Moves to `undeploying` right before the undeploy request is sent, so a cancel is refused from then on.
   * Throws a `DEPLOY_CANCELLED` error when the deployment was already cancelled.
   */
  startUndeploy(): void
}

export type DeployFunction = (linkerResponse: LinkerResponse, context: DeployContext) => Promise<DeploymentResult>

export type CancelOutcome = 'cancelled' | 'cancelling' | 'refused' | 'final'

// Backoff between checks of whether a cancelled upload got published anyway: 30 s of delays, plus up to
// 5 s per check (6 checks), so the outcome of a cancel settles in about 60 s at worst.
export const PUBLICATION_CHECK_DELAYS_MS: readonly number[] = [1000, 2000, 4000, 8000, 15000]

export interface IDeploymentComponent {
  state: IDeploymentStateComponent
  /** Whether a signed deployment can still be started. */
  canStart(): boolean
  /**
   * Runs the deployment once, moving the state to its final phase. Rejects with the deployment error, or
   * with a `DEPLOY_CANCELLED*` CliError when it was cancelled and the entity did not get published.
   */
  run(linkerResponse: LinkerResponse): Promise<DeploymentResult>
  /**
   * Cancels the deployment: before the signature it ends as `cancelled` right away, while preparing or
   * uploading it aborts the requests in flight and `run` settles the outcome. It is refused while undeploying,
   * since the world's scenes may already be gone once the undeploy request is sent.
   */
  cancel(): CancelOutcome
}

export function deploymentCancelledError() {
  return new CliError('DEPLOY_CANCELLED', 'Deployment cancelled')
}

export function cancelledAfterUndeployError() {
  return new CliError(
    'DEPLOY_CANCELLED_AFTER_UNDEPLOY',
    "Deployment cancelled after the world's previous scenes were removed. Deploy again to publish the scene."
  )
}

export function cancelOutcomeUncertainError() {
  return new CliError(
    'DEPLOY_CANCEL_OUTCOME_UNCERTAIN',
    'Deployment cancelled, but it could not be confirmed whether the server published it. ' +
      'Check the scene before deploying again.'
  )
}

const CANCEL_ERRORS = new Set([
  'DEPLOY_CANCELLED',
  'DEPLOY_CANCELLED_AFTER_UNDEPLOY',
  'DEPLOY_CANCEL_OUTCOME_UNCERTAIN'
])

export function createDeployment(options: {
  deploy: DeployFunction
  state?: IDeploymentStateComponent
}): IDeploymentComponent {
  const { deploy } = options
  const state = options.state ?? createDeploymentState()
  const abortController = new AbortController()
  let undeployStarted = false

  function canStart() {
    return state.get().phase === 'awaiting-signature'
  }

  function cancelError(error: unknown): CliError<CliErrorName> {
    if (error instanceof CliError && error.name === 'DEPLOY_CANCEL_OUTCOME_UNCERTAIN') return error
    if (undeployStarted) return cancelledAfterUndeployError()
    if (error instanceof CliError && CANCEL_ERRORS.has(error.name)) return error
    return deploymentCancelledError()
  }

  async function run(linkerResponse: LinkerResponse): Promise<DeploymentResult> {
    if (!canStart()) throw new Error('The deployment already started')
    // `uploading` without upload progress while preparing; `undeploying` only once the undeploy is sent.
    state.setPhase('uploading')
    const startUndeploy = () => {
      if (abortController.signal.aborted) throw deploymentCancelledError()
      undeployStarted = true
      state.setPhase('undeploying')
    }
    try {
      const result = await deploy(linkerResponse, { signal: abortController.signal, state, startUndeploy })
      state.deployed(result)
      return result
    } catch (error: any) {
      if (abortController.signal.aborted) {
        const cancelled = cancelError(error)
        state.cancelled(
          cancelled.name === 'DEPLOY_CANCELLED' ? undefined : { code: cancelled.name, message: cancelled.message }
        )
        throw cancelled
      }
      state.failed({
        code: error instanceof CliError ? error.name : 'DEPLOY_FAILED',
        message: error?.message ?? String(error)
      })
      throw error
    }
  }

  function cancel(): CancelOutcome {
    if (state.isFinal()) return 'final'
    if (state.get().phase === 'undeploying') return 'refused'
    const beforeSignature = canStart()
    state.requestCancel()
    abortController.abort()
    if (beforeSignature) {
      state.cancelled()
      return 'cancelled'
    }
    return 'cancelling'
  }

  return { state, canStart, run, cancel }
}

export type PublicationCheckOptions = {
  /** Whether every byte reached the server, so it may still be publishing the entity. */
  fullySent: boolean
  isPublished: () => Promise<boolean>
  delaysMs?: readonly number[]
}

/**
 * Settles an upload that failed after a cancellation: resolves when the server published the entity anyway,
 * otherwise rejects with a cancellation error. A fully sent upload is checked with backoff while the server
 * may still be publishing it.
 */
export async function settleCancelledUpload(
  components: Pick<CliComponents, 'logger'>,
  uploadError: unknown,
  { fullySent, isPublished, delaysMs = PUBLICATION_CHECK_DELAYS_MS }: PublicationCheckOptions
): Promise<void> {
  const { logger } = components
  logger.warn(`Upload interrupted by the cancellation: ${(uploadError as Error)?.message ?? String(uploadError)}`)

  let answered = false
  for (let attempt = 0; ; attempt++) {
    try {
      if (await isPublished()) {
        logger.warn('The deployment was cancelled after the server received it, and it got published.')
        return
      }
      answered = true
    } catch (e: any) {
      logger.warn(`Could not check whether the deployment got published: ${e?.message ?? String(e)}`)
    }
    if ((answered && !fullySent) || attempt >= delaysMs.length) break
    await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]))
  }

  if (!answered) {
    const error = cancelOutcomeUncertainError()
    logger.warn(error.message)
    throw error
  }
  logger.warn('Deployment cancelled.')
  throw deploymentCancelledError()
}
