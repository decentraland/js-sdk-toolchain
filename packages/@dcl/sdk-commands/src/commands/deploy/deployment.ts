import { LinkerResponse } from '../../linker-dapp/routes'
import { CliError } from '../../logic/error'
import { createDeploymentState, DeploymentResult, IDeploymentStateComponent } from './state'

export type DeployContext = { signal: AbortSignal; state: IDeploymentStateComponent }

export type DeployFunction = (linkerResponse: LinkerResponse, context: DeployContext) => Promise<DeploymentResult>

export type CancelOutcome = 'cancelled' | 'cancelling' | 'final'

export interface IDeploymentComponent {
  state: IDeploymentStateComponent
  /** Whether a signed deployment can still be started. */
  canStart(): boolean
  /**
   * Runs the deployment once, moving the state to its final phase. Rejects with the deployment error, or
   * with a `DEPLOY_CANCELLED` CliError when it was cancelled and the entity did not get published.
   */
  run(linkerResponse: LinkerResponse): Promise<DeploymentResult>
  /**
   * Cancels the deployment: before the signature it ends as `cancelled` right away, during the deployment
   * it aborts the requests in flight and `run` settles the outcome.
   */
  cancel(): CancelOutcome
}

export function deploymentCancelledError() {
  return new CliError('DEPLOY_CANCELLED', 'Deployment cancelled')
}

export function createDeployment(options: {
  needsUndeploy: boolean
  deploy: DeployFunction
  state?: IDeploymentStateComponent
}): IDeploymentComponent {
  const { needsUndeploy, deploy } = options
  const state = options.state ?? createDeploymentState()
  const abortController = new AbortController()

  function canStart() {
    return state.get().phase === 'awaiting-signature'
  }

  async function run(linkerResponse: LinkerResponse): Promise<DeploymentResult> {
    if (!canStart()) throw new Error('The deployment already started')
    state.setPhase(needsUndeploy ? 'undeploying' : 'uploading')
    try {
      const result = await deploy(linkerResponse, { signal: abortController.signal, state })
      state.deployed(result)
      return result
    } catch (error: any) {
      if (abortController.signal.aborted) {
        state.cancelled()
        throw deploymentCancelledError()
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
    const beforeSignature = canStart()
    abortController.abort()
    if (beforeSignature) {
      state.cancelled()
      return 'cancelled'
    }
    return 'cancelling'
  }

  return { state, canStart, run, cancel }
}
