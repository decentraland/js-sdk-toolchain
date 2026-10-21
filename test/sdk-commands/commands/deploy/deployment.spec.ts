import {
  CancelOutcome,
  createDeployment,
  DeployContext,
  IDeploymentComponent,
  settleCancelledUpload
} from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/deployment'
import { DeploymentResult, DeploymentState } from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/state'
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
    let stateWhilePreparing: DeploymentState
    let phaseWhileUndeploying: string

    beforeEach(async () => {
      deploy.mockImplementationOnce(async (_response, { state, startUndeploy }) => {
        stateWhilePreparing = state.get()
        startUndeploy()
        phaseWhileUndeploying = state.get().phase
        return { entityId: 'bafkreientity' }
      })
      deployment = createDeployment({ deploy })
      await deployment.run(linkerResponse)
    })

    it('should be uploading without upload progress while preparing the undeploy', () => {
      expect(stateWhilePreparing).toEqual(expect.objectContaining({ phase: 'uploading', upload: null }))
    })

    it('should be undeploying once the undeploy starts', () => {
      expect(phaseWhileUndeploying).toBe('undeploying')
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
      deployment = createDeployment({ deploy })
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
      deployment = createDeployment({ deploy })
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
      deployment = createDeployment({ deploy })
      await deployment.run(linkerResponse).catch(() => undefined)
    })

    it('should report a generic error code', () => {
      expect(deployment.state.get().error).toEqual({ code: 'DEPLOY_FAILED', message: 'boom' })
    })
  })

  describe('and it is cancelled before the signature', () => {
    let outcome: CancelOutcome

    beforeEach(() => {
      deployment = createDeployment({ deploy })
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
      deployment = createDeployment({ deploy })
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

      it('should end as cancelled without an error', () => {
        expect(deployment.state.get()).toEqual(
          expect.objectContaining({ phase: 'cancelled', error: null, cancelRequested: true })
        )
      })
    })

    describe('and it cannot be told whether the entity got published', () => {
      let error: unknown

      beforeEach(async () => {
        deploy.mockImplementationOnce(
          (_response, context) =>
            new Promise((_resolve, reject) => {
              context.signal.addEventListener('abort', () =>
                reject(new CliError('DEPLOY_CANCEL_OUTCOME_UNCERTAIN', 'Could not confirm'))
              )
            })
        )
        running = deployment.run(linkerResponse)
        deployment.cancel()
        error = await running.catch((e) => e)
      })

      it('should reject with the uncertain outcome error', () => {
        expect(error).toEqual(expect.objectContaining({ name: 'DEPLOY_CANCEL_OUTCOME_UNCERTAIN' }))
      })

      it('should end as cancelled carrying the uncertain outcome', () => {
        expect(deployment.state.get()).toEqual(
          expect.objectContaining({
            phase: 'cancelled',
            error: { code: 'DEPLOY_CANCEL_OUTCOME_UNCERTAIN', message: 'Could not confirm' }
          })
        )
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

  describe('and it is cancelled while preparing to undeploy the world scenes', () => {
    let outcome: CancelOutcome
    let error: unknown
    let phases: string[]

    beforeEach(async () => {
      phases = []
      let preparing: () => void = () => undefined
      deploy.mockImplementationOnce(async (_response, context) => {
        await new Promise<void>((resolve) => {
          preparing = resolve
        })
        context.startUndeploy()
        return { entityId: 'bafkreientity' }
      })
      deployment = createDeployment({ deploy })
      deployment.state.subscribe((state) => phases.push(state.phase))
      const running = deployment.run(linkerResponse)
      outcome = deployment.cancel()
      preparing()
      error = await running.catch((e) => e)
    })

    it('should accept the cancellation', () => {
      expect(outcome).toBe('cancelling')
    })

    it('should reject with a DEPLOY_CANCELLED error', () => {
      expect(error).toEqual(expect.objectContaining({ constructor: CliError, name: 'DEPLOY_CANCELLED' }))
    })

    it('should end as cancelled without an error', () => {
      expect(deployment.state.get()).toEqual(expect.objectContaining({ phase: 'cancelled', error: null }))
    })

    it('should never start undeploying', () => {
      expect(phases).not.toContain('undeploying')
    })
  })

  describe('and it is cancelled while undeploying the world scenes', () => {
    let outcome: CancelOutcome
    let signal: AbortSignal
    let finish: (result: DeploymentResult) => void

    beforeEach(() => {
      deploy.mockImplementationOnce(
        (_response, context) =>
          new Promise((resolve) => {
            signal = context.signal
            finish = resolve
            context.startUndeploy()
          })
      )
      deployment = createDeployment({ deploy })
      void deployment.run(linkerResponse)
      outcome = deployment.cancel()
    })

    afterEach(() => {
      finish({ entityId: 'bafkreientity' })
    })

    it('should refuse the cancellation', () => {
      expect(outcome).toBe('refused')
    })

    it('should not abort the deployment', () => {
      expect(signal.aborted).toBe(false)
    })

    it('should keep undeploying without a requested cancellation', () => {
      expect(deployment.state.get()).toEqual(expect.objectContaining({ phase: 'undeploying', cancelRequested: false }))
    })
  })

  describe('and it is cancelled while uploading after undeploying the world scenes', () => {
    let outcome: CancelOutcome
    let error: unknown

    beforeEach(async () => {
      deploy.mockImplementationOnce(
        (_response, context) =>
          new Promise((_resolve, reject) => {
            context.startUndeploy()
            context.state.setPhase('uploading')
            context.signal.addEventListener('abort', () => reject(new Error('This operation was aborted')))
          })
      )
      deployment = createDeployment({ deploy })
      const running = deployment.run(linkerResponse)
      outcome = deployment.cancel()
      error = await running.catch((e) => e)
    })

    it('should accept the cancellation', () => {
      expect(outcome).toBe('cancelling')
    })

    it('should reject with a DEPLOY_CANCELLED_AFTER_UNDEPLOY error', () => {
      expect(error).toEqual(expect.objectContaining({ constructor: CliError, name: 'DEPLOY_CANCELLED_AFTER_UNDEPLOY' }))
    })

    it('should end as cancelled carrying the undeploy caveat', () => {
      expect(deployment.state.get()).toEqual(
        expect.objectContaining({
          phase: 'cancelled',
          error: expect.objectContaining({
            code: 'DEPLOY_CANCELLED_AFTER_UNDEPLOY',
            message: expect.stringContaining("world's previous scenes were removed")
          })
        })
      )
    })
  })

  describe('and it cannot be told whether the entity got published after undeploying the world scenes', () => {
    let error: unknown

    beforeEach(async () => {
      deploy.mockImplementationOnce(
        (_response, context) =>
          new Promise((_resolve, reject) => {
            context.startUndeploy()
            context.state.setPhase('uploading')
            context.signal.addEventListener('abort', () =>
              reject(new CliError('DEPLOY_CANCEL_OUTCOME_UNCERTAIN', 'Could not confirm'))
            )
          })
      )
      deployment = createDeployment({ deploy })
      const running = deployment.run(linkerResponse)
      deployment.cancel()
      error = await running.catch((e) => e)
    })

    it('should reject with the uncertain outcome error', () => {
      expect(error).toEqual(expect.objectContaining({ name: 'DEPLOY_CANCEL_OUTCOME_UNCERTAIN' }))
    })

    it('should end as cancelled carrying the uncertain outcome', () => {
      expect(deployment.state.get().error).toEqual({
        code: 'DEPLOY_CANCEL_OUTCOME_UNCERTAIN',
        message: 'Could not confirm'
      })
    })
  })

  describe('and it is cancelled after it ended', () => {
    let outcome: CancelOutcome

    beforeEach(async () => {
      deploy.mockResolvedValueOnce({ entityId: 'bafkreientity' })
      deployment = createDeployment({ deploy })
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

describe('when settling an upload that failed after a cancellation', () => {
  let logger: { log: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock }
  let isPublished: jest.Mock<Promise<boolean>, []>
  let fullySent: boolean
  let outcome: unknown

  beforeEach(() => {
    logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
    isPublished = jest.fn()
    fullySent = false
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  async function settle() {
    outcome = await settleCancelledUpload({ logger } as any, new Error('socket hang up'), {
      fullySent,
      isPublished,
      delaysMs: [0, 0, 0]
    }).then(
      () => 'published',
      (e) => e
    )
  }

  describe('and the server published the entity', () => {
    beforeEach(async () => {
      isPublished.mockResolvedValueOnce(true)
      await settle()
    })

    it('should resolve', () => {
      expect(outcome).toBe('published')
    })

    it('should log the error that interrupted the upload', () => {
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('socket hang up'))
    })
  })

  describe('and the upload was not fully sent and the entity is not published', () => {
    beforeEach(async () => {
      isPublished.mockResolvedValue(false)
      await settle()
    })

    it('should reject with a DEPLOY_CANCELLED error', () => {
      expect(outcome).toEqual(expect.objectContaining({ constructor: CliError, name: 'DEPLOY_CANCELLED' }))
    })

    it('should check only once', () => {
      expect(isPublished).toHaveBeenCalledTimes(1)
    })
  })

  describe('and the upload was fully sent and the server publishes it a bit later', () => {
    beforeEach(async () => {
      fullySent = true
      isPublished.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true)
      await settle()
    })

    it('should resolve', () => {
      expect(outcome).toBe('published')
    })

    it('should keep checking until it is published', () => {
      expect(isPublished).toHaveBeenCalledTimes(3)
    })
  })

  describe('and the upload was fully sent and the entity never gets published', () => {
    beforeEach(async () => {
      fullySent = true
      isPublished.mockResolvedValue(false)
      await settle()
    })

    it('should reject with a DEPLOY_CANCELLED error', () => {
      expect(outcome).toEqual(expect.objectContaining({ name: 'DEPLOY_CANCELLED' }))
    })

    it('should check once per delay plus the first check', () => {
      expect(isPublished).toHaveBeenCalledTimes(4)
    })
  })

  describe('and the first check fails but a later one answers', () => {
    beforeEach(async () => {
      isPublished.mockRejectedValueOnce(new Error('The operation was aborted due to timeout'))
      isPublished.mockResolvedValueOnce(false)
      await settle()
    })

    it('should reject with a DEPLOY_CANCELLED error', () => {
      expect(outcome).toEqual(expect.objectContaining({ name: 'DEPLOY_CANCELLED' }))
    })

    it('should retry the check', () => {
      expect(isPublished).toHaveBeenCalledTimes(2)
    })
  })

  describe('and no check can tell whether it got published', () => {
    beforeEach(async () => {
      isPublished.mockRejectedValue(new Error('The operation was aborted due to timeout'))
      await settle()
    })

    it('should reject with a DEPLOY_CANCEL_OUTCOME_UNCERTAIN error', () => {
      expect(outcome).toEqual(
        expect.objectContaining({ constructor: CliError, name: 'DEPLOY_CANCEL_OUTCOME_UNCERTAIN' })
      )
    })

    it('should warn that the outcome is uncertain', () => {
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('could not be confirmed'))
    })

    it('should give up after the last delay', () => {
      expect(isPublished).toHaveBeenCalledTimes(4)
    })
  })
})
