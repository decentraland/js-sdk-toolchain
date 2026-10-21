import {
  ContentClient,
  PartialDeploymentNotSupportedError,
  PartialDeploymentResult,
  UploadProgress
} from 'dcl-catalyst-client'
import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
import { printProgressInfo } from '../../logic/beautiful-logs'
import { withDeadline } from '../../logic/fetch'
import { IDeploymentStateComponent } from './state'
import { CatalystFetchInit } from './utils'

type DeploymentData = Parameters<ContentClient['deploy']>[0]

// Worlds also answers the publishing batch with a deployment message.
type PartialUploadResult = PartialDeploymentResult & { message?: string }

export type UploadResult = {
  message?: string
}

export type UploadOptions = {
  signal?: AbortSignal
  progress?: Pick<IDeploymentStateComponent, 'reportUpload' | 'reportBatches'>
}

const REQUEST_TIMEOUT_MS = 600000

export const CONTENT_AVAILABILITY_TIMEOUT_MS = 30000

// The infrastructure in front of the content servers times out requests larger than ~200MB.
export const MAX_SINGLE_REQUEST_BYTES = 200 * 1000 * 1000

// Smaller scenes upload faster in one request than in batches.
export const MIN_PARTIAL_DEPLOYMENT_BYTES = 50 * 1024 * 1024

// Batches small enough that the server stores one while the next is still uploading.
export const PARTIAL_BATCH_BYTES = 32 * 1024 * 1024
export const PARTIAL_BATCH_CONCURRENCY = 3

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`
}

function batchSize(deployData: DeploymentData): number {
  let largest = 0
  for (const file of deployData.files.values()) {
    largest = Math.max(largest, file.byteLength)
  }
  return Math.max(PARTIAL_BATCH_BYTES, largest)
}

function deploymentSize(deployData: DeploymentData): number {
  let total = 0
  for (const file of deployData.files.values()) {
    total += file.byteLength
  }
  return total
}

async function fetchAvailableContent(
  client: ContentClient,
  contentHashes: string[],
  signal?: AbortSignal
): Promise<Set<string>> {
  try {
    const availability = await withDeadline(
      (deadline) => {
        const init: CatalystFetchInit = { signal: deadline, rejectHttpErrors: true }
        return client.isContentAvailable(contentHashes, init as Parameters<ContentClient['isContentAvailable']>[1])
      },
      { timeoutMs: CONTENT_AVAILABILITY_TIMEOUT_MS, signal }
    )
    if (!Array.isArray(availability)) throw new Error('unexpected response')
    return new Set(availability.filter(({ available }) => available === true).map(({ cid }) => cid))
  } catch (error: any) {
    if (signal?.aborted) throw error
    const reason = error?.message ?? String(error)
    throw new CliError('DEPLOY_CONTENT_CHECK_FAILED', `Couldn't check which content the server already has (${reason})`)
  }
}

// A single request only uploads the files missing on the server, plus the entity file.
async function missingBytes(client: ContentClient, deployData: DeploymentData, signal?: AbortSignal): Promise<number> {
  const contentHashes = Array.from(deployData.files.keys()).filter((hash) => hash !== deployData.entityId)
  const available = contentHashes.length ? await fetchAvailableContent(client, contentHashes, signal) : new Set()
  let total = 0
  for (const [hash, file] of deployData.files) {
    if (!available.has(hash)) total += file.byteLength
  }
  return total
}

function uploadProgressReporter(progress: UploadOptions['progress']) {
  return (
    progress &&
    (({ phase, sentBytes, totalBytes }: UploadProgress) =>
      progress.reportUpload({ stage: phase, sentBytes, totalBytes }))
  )
}

async function uploadInSingleRequest(
  client: ContentClient,
  deployData: DeploymentData,
  { signal, progress }: UploadOptions
): Promise<UploadResult> {
  progress?.reportBatches(null)
  const response = (await client.deploy(deployData, {
    timeout: REQUEST_TIMEOUT_MS,
    signal,
    onUploadProgress: uploadProgressReporter(progress)
  })) as any
  if (response.status !== 200) {
    throw new Error(await response.text())
  }
  return (await response.json()) as UploadResult
}

/**
 * Uploads a deployment of at least {@link MIN_PARTIAL_DEPLOYMENT_BYTES} in size-bounded batches when the
 * client supports partial deployments, falling back to a single request for servers that don't support them.
 * Smaller deployments always use a single request.
 */
export async function uploadDeployment(
  components: Pick<CliComponents, 'logger'>,
  client: ContentClient,
  deployData: DeploymentData,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { signal, progress } = options
  const size = deploymentSize(deployData)
  if (size < MIN_PARTIAL_DEPLOYMENT_BYTES) {
    return uploadInSingleRequest(client, deployData, options)
  }

  try {
    progress?.reportBatches({ completedBatches: 0, totalBatches: 1 })
    const result: PartialUploadResult = await client.deployPartial(deployData, {
      timeout: REQUEST_TIMEOUT_MS,
      signal,
      maxBatchSizeBytes: batchSize(deployData),
      concurrency: PARTIAL_BATCH_CONCURRENCY,
      onUploadProgress: uploadProgressReporter(progress),
      onProgress: ({ uploadedBytes, totalBytes, completedBatches, totalBatches }) => {
        progress?.reportBatches({ completedBatches, totalBatches })
        printProgressInfo(
          components.logger,
          `Uploaded ${formatMegabytes(uploadedBytes)} of ${formatMegabytes(totalBytes)} ` +
            `(batch ${completedBatches}/${totalBatches})`
        )
      }
    })
    return { message: result.message }
  } catch (error: any) {
    if (!(error instanceof PartialDeploymentNotSupportedError) || signal?.aborted) {
      throw error
    }
    const missing = size > MAX_SINGLE_REQUEST_BYTES ? await missingBytes(client, deployData, signal) : size
    if (missing > MAX_SINGLE_REQUEST_BYTES) {
      throw new CliError(
        'DEPLOY_PARTIAL_NOT_SUPPORTED',
        `The target server does not support batched uploads, and the content of this scene missing on it ` +
          `(${formatMegabytes(missing)}) is too large to upload in a single request ` +
          `(max ${formatMegabytes(MAX_SINGLE_REQUEST_BYTES)}).`
      )
    }
    components.logger.warn('The target server does not support batched uploads, uploading in a single request.')
    return uploadInSingleRequest(client, deployData, options)
  }
}
