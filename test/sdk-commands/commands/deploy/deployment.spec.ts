import {
  CancelOutcome,
  createDeployment,
  DeployContext,
  IDeploymentComponent
} from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/deployment'
import { DeploymentResult } from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/state'
import { LinkerResponse } from '../../../../packages/@dcl/sdk-commands/src/linker-dapp/routes'
import { CliError } from '../../../../packages/@dcl/sdk-commands/src/logic/error'

const linkerResponse = { address: '0x1', authChain: [], chainId: 1 } as unknown as LinkerResponse

describe('when running a deployment', () => {
  let deploy: jest.Mock<Promise<DeploymentResult>, [LinkerResponse, DeployContext]>
  let deployment: IDeploymentComponent

  beforeEach(() => {
    deploy = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and it has to undeploy the world scenes first', () => {
    let phaseWhileDeploying: string

    beforeEach(async () => {
      deploy.mockImplementationOnce(async (_response, { state }) => {
        phaseWhileDeploying = state.get().phase
        return { entityId: 'bafkreientity' }
      })
      deployment = createDeployment({ needsUndeploy: true, deploy })
      await deployment.run(linkerResponse)
    })

    it('should be undeploying while it runs', () => {
      expect(phaseWhileDeploying).toBe('undeploying')
    })
  })

  describe('and the upload succeeds', () => {
    let result: DeploymentResult
    let phaseWhileDeploying: string

    beforeEach(async () => {
      deploy.mockImplementationOnce(async (_response, { state }) => {
        phaseWhileDeploying = state.get().phase
        return { entityId: 'bafkreientity', message: 'Live' }
      })
      deployment = createDeployment({ needsUndeploy: false, deploy })
      result = await deployment.run(linkerResponse)
    })

    it('should be uploading while it runs', () => {
      expect(phaseWhileDeploying).toBe('uploading')
    })

    it('should resolve with the result', () => {
      expect(result).toEqual({ entityId: 'bafkreientity', message: 'Live' })
    })

    it('should end as deployed with the result', () => {
      expect(deployment.state.get()).toEqual(
        expect.objectContaining({ phase: 'deployed', result: { entityId: 'bafkreientity', message: 'Live' } })
      )
    })

    it('should not allow starting it again', () => {
      expect(deployment.canStart()).toBe(false)
    })
  })

  describe('and the deployment fails', () => {
    let error: unknown

    beforeEach(async () => {
      deploy.mockRejectedValueOnce(new CliError('DEPLOY_NO_PERMISSION', 'No permission'))
      deployment = createDeployment({ needsUndeploy: false, deploy })
      error = await deployment.run(linkerResponse).catch((e) => e)
    })

    it('should reject with the deployment error', () => {
      expect(error).toEqual(expect.objectContaining({ name: 'DEPLOY_NO_PERMISSION', message: 'No permission' }))
    })

    it('should end as failed with the error code and message', () => {
      expect(deployment.state.get()).toEqual(
        expect.objectContaining({ phase: 'failed', error: { code: 'DEPLOY_NO_PERMISSION', message: 'No permission' } })
      )
    })
  })

  describe('and it fails with an error that is not a CLI error', () => {
    beforeEach(async () => {
      deploy.mockRejectedValueOnce(new Error('boom'))
      deployment = createDeployment({ needsUndeploy: false, deploy })
      await deployment.run(linkerResponse).catch(() => undefined)
    })

    it('should report a generic error code', () => {
      expect(deployment.state.get().error).toEqual({ code: 'DEPLOY_FAILED', message: 'boom' })
    })
  })

  describe('and it is cancelled before the signature', () => {
    let outcome: CancelOutcome

    beforeEach(() => {
      deployment = createDeployment({ needsUndeploy: false, deploy })
      outcome = deployment.cancel()
    })

    it('should report it as cancelled right away', () => {
      expect(outcome).toBe('cancelled')
    })

    it('should end as cancelled', () => {
      expect(deployment.state.get().phase).toBe('cancelled')
    })

    it('should not allow starting it', () => {
      expect(deployment.canStart()).toBe(false)
    })
  })

  describe('and it is cancelled while uploading', () => {
    let outcome: CancelOutcome
    let running: Promise<DeploymentResult>
    let signal: AbortSignal

    beforeEach(() => {
      deployment = createDeployment({ needsUndeploy: false, deploy })
    })

    describe('and the upload gets aborted', () => {
      let error: unknown

      beforeEach(async () => {
        deploy.mockImplementationOnce(
          (_response, context) =>
            new Promise((_resolve, reject) => {
              signal = context.signal
              signal.addEventListener('abort', () => reject(new Error('This operation was aborted')))
            })
        )
        running = deployment.run(linkerResponse)
        outcome = deployment.cancel()
        error = await running.catch((e) => e)
      })

      it('should report the cancellation as in progress', () => {
        expect(outcome).toBe('cancelling')
      })

      it('should abort the signal handed to the upload', () => {
        expect(signal.aborted).toBe(true)
      })

      it('should reject with a DEPLOY_CANCELLED error', () => {
        expect(error).toEqual(expect.objectContaining({ constructor: CliError, name: 'DEPLOY_CANCELLED' }))
      })

      it('should end as cancelled', () => {
        expect(deployment.state.get().phase).toBe('cancelled')
      })
    })

    describe('and the entity gets published anyway', () => {
      let result: DeploymentResult

      beforeEach(async () => {
        deploy.mockImplementationOnce(
          (_response, context) =>
            new Promise((resolve) => {
              context.signal.addEventListener('abort', () => resolve({ entityId: 'bafkreientity' }))
            })
        )
        running = deployment.run(linkerResponse)
        deployment.cancel()
        result = await running
      })

      it('should resolve with the result', () => {
        expect(result).toEqual({ entityId: 'bafkreientity' })
      })

      it('should end as deployed', () => {
        expect(deployment.state.get().phase).toBe('deployed')
      })
    })
  })

  describe('and it is cancelled after it ended', () => {
    let outcome: CancelOutcome

    beforeEach(async () => {
      deploy.mockResolvedValueOnce({ entityId: 'bafkreientity' })
      deployment = createDeployment({ needsUndeploy: false, deploy })
      await deployment.run(linkerResponse)
      outcome = deployment.cancel()
    })

    it('should report it as already final', () => {
      expect(outcome).toBe('final')
    })

    it('should stay deployed', () => {
      expect(deployment.state.get().phase).toBe('deployed')
    })
  })
})
