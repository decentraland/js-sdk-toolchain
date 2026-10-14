export type DeploymentPhase = 'awaiting-signature' | 'undeploying' | 'uploading' | 'deployed' | 'failed' | 'cancelled'

export type UploadStage = 'checking' | 'uploading' | 'processing'

export type DeploymentUpload = {
  stage: UploadStage
  sentBytes: number
  totalBytes: number
  completedBatches: number | null
  totalBatches: number | null
}

export type DeploymentResult = { entityId: string; message?: string }

export type DeploymentError = { code: string; message: string }

export type DeploymentState = {
  phase: DeploymentPhase
  upload: DeploymentUpload | null
  result: DeploymentResult | null
  error: DeploymentError | null
}

export type UploadProgressUpdate = { stage: UploadStage; sentBytes: number; totalBytes: number }

export type BatchProgressUpdate = { completedBatches: number; totalBatches: number }

export type DeploymentStateListener = (state: DeploymentState) => void

export interface IDeploymentStateComponent {
  /** Returns a snapshot of the current state. */
  get(): DeploymentState
  isFinal(): boolean
  /** Moves a deployment in progress to `undeploying` or `uploading`. Ignored once final. */
  setPhase(phase: 'undeploying' | 'uploading'): void
  /** Records byte-level progress. Notifications are throttled unless the stage changes. */
  reportUpload(progress: UploadProgressUpdate): void
  /** Records batch progress of a partial upload, or `null` when the upload uses a single request. */
  reportBatches(progress: BatchProgressUpdate | null): void
  deployed(result: DeploymentResult): void
  failed(error: DeploymentError): void
  cancelled(): void
  /** Calls `listener` on every change until the returned function is called. */
  subscribe(listener: DeploymentStateListener): () => void
  subscriberCount(): number
}

export const FINAL_PHASES: ReadonlySet<DeploymentPhase> = new Set(['deployed', 'failed', 'cancelled'])

export const PROGRESS_NOTIFICATION_INTERVAL_MS = 250

export function createDeploymentState(
  options: { progressIntervalMs?: number; now?: () => number } = {}
): IDeploymentStateComponent {
  const progressIntervalMs = options.progressIntervalMs ?? PROGRESS_NOTIFICATION_INTERVAL_MS
  const now = options.now ?? Date.now
  const listeners = new Set<DeploymentStateListener>()

  let state: DeploymentState = { phase: 'awaiting-signature', upload: null, result: null, error: null }
  let batches: { completedBatches: number | null; totalBatches: number | null } = {
    completedBatches: null,
    totalBatches: null
  }
  // Keeps sentBytes monotonic when an upload restarts (a partial upload falling back to a single request).
  let restartOffset = 0
  let lastSentBytes = 0
  let lastNotification = 0
  let pendingTimer: ReturnType<typeof setTimeout> | undefined

  function snapshot(): DeploymentState {
    return {
      ...state,
      upload: state.upload && { ...state.upload },
      result: state.result && { ...state.result },
      error: state.error && { ...state.error }
    }
  }

  function notify() {
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      pendingTimer = undefined
    }
    lastNotification = now()
    const current = snapshot()
    for (const listener of Array.from(listeners)) {
      try {
        listener(current)
      } catch {
        listeners.delete(listener)
      }
    }
  }

  function notifyThrottled() {
    const elapsed = now() - lastNotification
    if (elapsed >= progressIntervalMs) {
      notify()
    } else if (!pendingTimer) {
      pendingTimer = setTimeout(notify, progressIntervalMs - elapsed)
      pendingTimer.unref?.()
    }
  }

  function isFinal() {
    return FINAL_PHASES.has(state.phase)
  }

  function finish(next: Partial<DeploymentState> & { phase: DeploymentPhase }) {
    if (isFinal()) return
    state = { ...state, ...next }
    notify()
    listeners.clear()
  }

  return {
    get: snapshot,
    isFinal,
    setPhase(phase) {
      if (isFinal() || state.phase === phase) return
      state = { ...state, phase }
      notify()
    },
    reportUpload({ stage, sentBytes, totalBytes }) {
      if (isFinal()) return
      if (sentBytes < lastSentBytes) {
        restartOffset = state.upload?.sentBytes ?? 0
      }
      lastSentBytes = sentBytes
      const previousStage = state.upload?.stage
      state = {
        ...state,
        phase: 'uploading',
        upload: {
          stage,
          sentBytes: restartOffset + sentBytes,
          totalBytes: restartOffset + totalBytes,
          ...batches
        }
      }
      if (previousStage === stage) {
        notifyThrottled()
      } else {
        notify()
      }
    },
    reportBatches(progress) {
      if (isFinal()) return
      batches = progress
        ? { completedBatches: progress.completedBatches, totalBatches: progress.totalBatches }
        : { completedBatches: null, totalBatches: null }
      if (!state.upload) return
      state = { ...state, upload: { ...state.upload, ...batches } }
      notifyThrottled()
    },
    deployed(result) {
      finish({ phase: 'deployed', result: { ...result } })
    },
    failed(error) {
      finish({ phase: 'failed', error: { ...error } })
    },
    cancelled() {
      finish({ phase: 'cancelled' })
    },
    subscribe(listener) {
      if (isFinal()) return () => {}
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    subscriberCount() {
      return listeners.size
    }
  }
}
