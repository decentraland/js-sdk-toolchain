import {
  createDeploymentState,
  DeploymentState,
  IDeploymentStateComponent
} from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/state'

const PROGRESS_INTERVAL_MS = 250

describe('when following the state of a deployment', () => {
  let clock: number
  let state: IDeploymentStateComponent
  let listener: jest.Mock<void, [DeploymentState]>

  beforeEach(() => {
    jest.useFakeTimers()
    clock = 1000
    state = createDeploymentState({ progressIntervalMs: PROGRESS_INTERVAL_MS, now: () => clock })
    listener = jest.fn()
    state.subscribe(listener)
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('and nothing happened yet', () => {
    it('should be awaiting the signature without upload, result, error or cancellation', () => {
      expect(state.get()).toEqual({
        phase: 'awaiting-signature',
        upload: null,
        result: null,
        error: null,
        cancelRequested: false
      })
    })
  })

  describe('and the deployment moves to undeploying', () => {
    beforeEach(() => {
      state.setPhase('undeploying')
    })

    it('should notify the new phase', () => {
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ phase: 'undeploying' }))
    })
  })

  describe('and a single request upload reports progress', () => {
    beforeEach(() => {
      state.setPhase('uploading')
      state.reportBatches(null)
      state.reportUpload({ stage: 'uploading', sentBytes: 10, totalBytes: 100 })
    })

    it('should expose the bytes without batches', () => {
      expect(state.get().upload).toEqual({
        stage: 'uploading',
        sentBytes: 10,
        totalBytes: 100,
        completedBatches: null,
        totalBatches: null
      })
    })
  })

  describe('and a partial upload reports batch progress', () => {
    beforeEach(() => {
      state.reportBatches({ completedBatches: 0, totalBatches: 1 })
      state.reportUpload({ stage: 'uploading', sentBytes: 10, totalBytes: 100 })
      clock += PROGRESS_INTERVAL_MS
      state.reportBatches({ completedBatches: 1, totalBatches: 3 })
    })

    it('should expose the batches next to the bytes', () => {
      expect(state.get().upload).toEqual({
        stage: 'uploading',
        sentBytes: 10,
        totalBytes: 100,
        completedBatches: 1,
        totalBatches: 3
      })
    })
  })

  describe('and progress of the same stage arrives faster than the notification interval', () => {
    beforeEach(() => {
      state.reportUpload({ stage: 'uploading', sentBytes: 10, totalBytes: 100 })
      clock += 10
      state.reportUpload({ stage: 'uploading', sentBytes: 20, totalBytes: 100 })
      clock += 10
      state.reportUpload({ stage: 'uploading', sentBytes: 30, totalBytes: 100 })
    })

    it('should notify only the first update right away', () => {
      expect(listener.mock.calls.map(([s]) => s.upload?.sentBytes)).toEqual([10])
    })

    describe('and the notification interval elapses', () => {
      beforeEach(() => {
        jest.advanceTimersByTime(PROGRESS_INTERVAL_MS)
      })

      it('should notify the latest progress once', () => {
        expect(listener.mock.calls.map(([s]) => s.upload?.sentBytes)).toEqual([10, 30])
      })
    })
  })

  describe('and the upload stage changes within the notification interval', () => {
    beforeEach(() => {
      state.reportUpload({ stage: 'uploading', sentBytes: 100, totalBytes: 100 })
      clock += 10
      state.reportUpload({ stage: 'processing', sentBytes: 100, totalBytes: 100 })
    })

    it('should notify the stage change right away', () => {
      expect(listener.mock.calls.map(([s]) => s.upload?.stage)).toEqual(['uploading', 'processing'])
    })
  })

  describe('and the upload restarts from zero bytes', () => {
    beforeEach(() => {
      state.reportUpload({ stage: 'uploading', sentBytes: 40, totalBytes: 100 })
      state.reportUpload({ stage: 'checking', sentBytes: 0, totalBytes: 100 })
      state.reportUpload({ stage: 'uploading', sentBytes: 5, totalBytes: 100 })
    })

    it('should keep the sent bytes monotonic by counting the previous attempt', () => {
      expect(state.get().upload).toEqual(expect.objectContaining({ sentBytes: 45, totalBytes: 140 }))
    })
  })

  describe('and the deployment gets published', () => {
    beforeEach(() => {
      state.reportUpload({ stage: 'uploading', sentBytes: 10, totalBytes: 100 })
      clock += 10
      state.reportUpload({ stage: 'uploading', sentBytes: 20, totalBytes: 100 })
      state.deployed({ entityId: 'bafkreientity', message: 'Your scene is live' })
      state.setPhase('uploading')
      state.failed({ code: 'DEPLOY_UPLOAD_FAILED', message: 'late failure' })
      jest.advanceTimersByTime(PROGRESS_INTERVAL_MS)
    })

    it('should end as deployed with the result', () => {
      expect(state.get()).toEqual(
        expect.objectContaining({
          phase: 'deployed',
          result: { entityId: 'bafkreientity', message: 'Your scene is live' },
          error: null
        })
      )
    })

    it('should notify the final state right away and nothing after it', () => {
      expect(listener.mock.calls.map(([s]) => s.phase)).toEqual(['uploading', 'deployed'])
    })

    it('should be final', () => {
      expect(state.isFinal()).toBe(true)
    })

    it('should drop its subscribers', () => {
      expect(state.subscriberCount()).toBe(0)
    })
  })

  describe('and the deployment fails', () => {
    beforeEach(() => {
      state.failed({ code: 'DEPLOY_NO_PERMISSION', message: 'No permission' })
    })

    it('should end as failed with the error', () => {
      expect(state.get()).toEqual(
        expect.objectContaining({ phase: 'failed', error: { code: 'DEPLOY_NO_PERMISSION', message: 'No permission' } })
      )
    })
  })

  describe('and the deployment is cancelled', () => {
    beforeEach(() => {
      state.cancelled()
      state.deployed({ entityId: 'bafkreientity' })
    })

    it('should stay cancelled without an error', () => {
      expect(state.get()).toEqual(expect.objectContaining({ phase: 'cancelled', result: null, error: null }))
    })
  })

  describe('and a cancellation is requested', () => {
    beforeEach(() => {
      state.setPhase('uploading')
      listener.mockClear()
      state.requestCancel()
      state.requestCancel()
    })

    it('should flag the cancellation without ending the deployment', () => {
      expect(state.get()).toEqual(expect.objectContaining({ phase: 'uploading', cancelRequested: true }))
    })

    it('should notify the change once', () => {
      expect(listener.mock.calls.map(([s]) => s.cancelRequested)).toEqual([true])
    })
  })

  describe('and a cancellation is requested after it ended', () => {
    beforeEach(() => {
      state.deployed({ entityId: 'bafkreientity' })
      state.requestCancel()
    })

    it('should not flag the cancellation', () => {
      expect(state.get().cancelRequested).toBe(false)
    })
  })

  describe('and the deployment is cancelled with a caveat', () => {
    beforeEach(() => {
      state.cancelled({ code: 'DEPLOY_CANCELLED_AFTER_UNDEPLOY', message: 'The world scenes were removed' })
    })

    it('should end as cancelled carrying the caveat as its error', () => {
      expect(state.get()).toEqual(
        expect.objectContaining({
          phase: 'cancelled',
          error: { code: 'DEPLOY_CANCELLED_AFTER_UNDEPLOY', message: 'The world scenes were removed' }
        })
      )
    })
  })

  describe('and the snapshot is modified by a caller', () => {
    beforeEach(() => {
      state.reportUpload({ stage: 'uploading', sentBytes: 10, totalBytes: 100 })
      state.get().upload!.sentBytes = 99
    })

    it('should not change the state', () => {
      expect(state.get().upload?.sentBytes).toBe(10)
    })
  })
})
