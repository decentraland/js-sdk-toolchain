import { ContentClient } from 'dcl-catalyst-client'
import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
import { printProgressInfo } from '../../logic/beautiful-logs'

type DeploymentData = Parameters<ContentClient['deploy']>[0]

// Mirrors the partial deployment surface of dcl-catalyst-client (ADR-325) until a release ships it.
type PartialDeploymentProgress = {
  uploadedBytes: number
  totalBytes: number
  completedBatches: number
  totalBatches: number
}

type PartialDeploymentClient = {
  deployPartial?: (
    deployData: DeploymentData,
    options?: { timeout?: number; onProgress?: (progress: PartialDeploymentProgress) => void }
  ) => Promise<{ creationTimestamp: number; message?: string }>
}

export type UploadResult = {
  message?: string
}

const REQUEST_TIMEOUT_MS = 600000

// The infrastructure in front of the content servers times out requests larger than ~200MB.
export const MAX_SINGLE_REQUEST_BYTES = 200 * 1000 * 1000

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`
}

function deploymentSize(deployData: DeploymentData): number {
  let total = 0
  for (const file of deployData.files.values()) {
    total += file.byteLength
  }
  return total
}

async function uploadInSingleRequest(client: ContentClient, deployData: DeploymentData): Promise<UploadResult> {
  const response = (await client.deploy(deployData, { timeout: REQUEST_TIMEOUT_MS })) as any
  if (response.status !== 200) {
    throw new Error(await response.text())
  }
  return (await response.json()) as UploadResult
}

/**
 * Uploads a deployment in size-bounded batches when the client supports partial deployments,
 * falling back to a single request for servers that don't support them.
 */
export async function uploadDeployment(
  components: Pick<CliComponents, 'logger'>,
  client: ContentClient,
  deployData: DeploymentData
): Promise<UploadResult> {
  const partialClient = client as ContentClient & PartialDeploymentClient
  if (typeof partialClient.deployPartial !== 'function') {
    return uploadInSingleRequest(client, deployData)
  }

  try {
    const result = await partialClient.deployPartial(deployData, {
      timeout: REQUEST_TIMEOUT_MS,
      onProgress: ({ uploadedBytes, totalBytes, completedBatches, totalBatches }) =>
        printProgressInfo(
          components.logger,
          `Uploaded ${formatMegabytes(uploadedBytes)} of ${formatMegabytes(totalBytes)} ` +
            `(batch ${completedBatches}/${totalBatches})`
        )
    })
    return { message: result.message }
  } catch (error: any) {
    if (error?.name !== 'PartialDeploymentNotSupportedError') {
      throw error
    }
    const size = deploymentSize(deployData)
    if (size > MAX_SINGLE_REQUEST_BYTES) {
      throw new CliError(
        'DEPLOY_PARTIAL_NOT_SUPPORTED',
        `The target server does not support batched uploads, and this scene (${formatMegabytes(size)}) ` +
          `is too large to upload in a single request (max ${formatMegabytes(MAX_SINGLE_REQUEST_BYTES)}).`
      )
    }
    components.logger.warn('The target server does not support batched uploads, uploading in a single request.')
    return uploadInSingleRequest(client, deployData)
  }
}
