import type { ContentClient } from 'dcl-catalyst-client'
import {
  MAX_SINGLE_REQUEST_BYTES,
  MIN_PARTIAL_DEPLOYMENT_BYTES,
  PARTIAL_BATCH_BYTES,
  PARTIAL_BATCH_CONCURRENCY,
  UploadResult,
  uploadDeployment
} from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/upload'
import { CliError } from '../../../../packages/@dcl/sdk-commands/src/logic/error'

type DeploymentData = Parameters<ContentClient['deploy']>[0]

function namedError(name: string, message: string): Error {
  const error = new Error(message)
  error.name = name
  return error
}

function createLogger() {
  return { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}

const ENTITY_FILE_BYTES = 10

function createDeployData(contentSize: number, fileCount = 1): DeploymentData {
  const files = new Map([['bafkreientity', new Uint8Array(ENTITY_FILE_BYTES)]])
  for (let i = 0; i < fileCount; i++) {
    files.set(`bafkreicontent${i}`, { byteLength: contentSize / fileCount } as Uint8Array)
  }
  return { entityId: 'bafkreientity', files, authChain: [] }
}

describe('when uploading a deployment', () => {
  let logger: ReturnType<typeof createLogger>
  let deploy: jest.Mock
  let deployData: DeploymentData

  beforeEach(() => {
    logger = createLogger()
    deploy = jest.fn()
    deployData = createDeployData(100)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and the client supports partial deployments', () => {
    let deployPartial: jest.Mock
    let client: ContentClient

    beforeEach(() => {
      deployPartial = jest.fn()
      client = { deploy, deployPartial } as unknown as ContentClient
      deployData = createDeployData(MIN_PARTIAL_DEPLOYMENT_BYTES - ENTITY_FILE_BYTES)
    })

    describe('and the deployment is smaller than the batching threshold', () => {
      let result: UploadResult

      beforeEach(async () => {
        deployData = createDeployData(MIN_PARTIAL_DEPLOYMENT_BYTES - ENTITY_FILE_BYTES - 1)
        deploy.mockResolvedValueOnce({ status: 200, json: async () => ({ message: 'Deployed' }) })
        result = await uploadDeployment({ logger }, client, deployData)
      })

      it('should upload the deployment in a single request', () => {
        expect(deploy).toHaveBeenCalledWith(deployData, { timeout: 600000 })
      })

      it('should not upload the deployment in batches', () => {
        expect(deployPartial).not.toHaveBeenCalled()
      })

      it('should resolve with the message of the single request', () => {
        expect(result).toEqual({ message: 'Deployed' })
      })
    })

    describe('and the server publishes the entity', () => {
      let result: UploadResult

      beforeEach(async () => {
        deployData = createDeployData(4 * PARTIAL_BATCH_BYTES, 4)
        deployPartial.mockImplementationOnce(async (_data, options) => {
          options.onProgress({ uploadedBytes: 2e6, totalBytes: 4e6, completedBatches: 1, totalBatches: 2 })
          return { creationTimestamp: 1, message: 'Your scene is live' }
        })
        result = await uploadDeployment({ logger }, client, deployData)
      })

      it('should resolve with the message returned by the server', () => {
        expect(result).toEqual({ message: 'Your scene is live' })
      })

      it('should upload in batches small enough to overlap with each other', () => {
        expect(deployPartial).toHaveBeenCalledWith(
          deployData,
          expect.objectContaining({ maxBatchSizeBytes: PARTIAL_BATCH_BYTES, concurrency: PARTIAL_BATCH_CONCURRENCY })
        )
      })

      it('should report the upload progress of each batch', () => {
        expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Uploaded 2.0 MB of 4.0 MB (batch 1/2)'))
      })

      it('should not upload the deployment in a single request', () => {
        expect(deploy).not.toHaveBeenCalled()
      })
    })

    describe('and a file is larger than the batch size', () => {
      beforeEach(async () => {
        deployData = createDeployData(MIN_PARTIAL_DEPLOYMENT_BYTES)
        deployPartial.mockResolvedValueOnce({ creationTimestamp: 1 })
        await uploadDeployment({ logger }, client, deployData)
      })

      it('should size the batches to fit that file', () => {
        expect(deployPartial).toHaveBeenCalledWith(
          deployData,
          expect.objectContaining({ maxBatchSizeBytes: MIN_PARTIAL_DEPLOYMENT_BYTES })
        )
      })
    })

    describe('and the server rejects the deployment', () => {
      let rejection: Error
      let error: unknown

      beforeEach(async () => {
        rejection = namedError('PartialDeploymentValidationError', 'The partial deployment was rejected: too big')
        deployPartial.mockRejectedValueOnce(rejection)
        error = await uploadDeployment({ logger }, client, deployData).catch((e) => e)
      })

      it('should reject with the server rejection', () => {
        expect(error).toBe(rejection)
      })

      it('should not retry the upload in a single request', () => {
        expect(deploy).not.toHaveBeenCalled()
      })
    })

    describe('and the server does not support partial deployments', () => {
      beforeEach(() => {
        deployPartial.mockRejectedValueOnce(
          namedError('PartialDeploymentNotSupportedError', 'The server does not support partial deployments')
        )
      })

      describe('and the deployment fits in a single request', () => {
        let result: UploadResult

        beforeEach(async () => {
          deploy.mockResolvedValueOnce({ status: 200, json: async () => ({ message: 'Deployed' }) })
          result = await uploadDeployment({ logger }, client, deployData)
        })

        it('should upload the deployment in a single request', () => {
          expect(deploy).toHaveBeenCalledWith(deployData, { timeout: 600000 })
        })

        it('should resolve with the message of the single request', () => {
          expect(result).toEqual({ message: 'Deployed' })
        })

        it('should warn that the server does not support batched uploads', () => {
          expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('does not support batched uploads'))
        })
      })

      describe('and the deployment is too large for a single request', () => {
        let error: unknown

        beforeEach(async () => {
          deployData = createDeployData(MAX_SINGLE_REQUEST_BYTES)
          error = await uploadDeployment({ logger }, client, deployData).catch((e) => e)
        })

        it('should reject with an error explaining the scene is too large for the server', () => {
          expect(error).toEqual(
            expect.objectContaining({
              constructor: CliError,
              name: 'DEPLOY_PARTIAL_NOT_SUPPORTED',
              message: expect.stringContaining('too large to upload in a single request')
            })
          )
        })

        it('should not upload the deployment in a single request', () => {
          expect(deploy).not.toHaveBeenCalled()
        })
      })
    })
  })

  describe('and the client does not support partial deployments', () => {
    let client: ContentClient

    beforeEach(() => {
      client = { deploy } as unknown as ContentClient
    })

    describe('and the server accepts the deployment', () => {
      let result: UploadResult

      beforeEach(async () => {
        deploy.mockResolvedValueOnce({ status: 200, json: async () => ({ message: 'Deployed' }) })
        result = await uploadDeployment({ logger }, client, deployData)
      })

      it('should resolve with the message returned by the server', () => {
        expect(result).toEqual({ message: 'Deployed' })
      })
    })

    describe('and the server rejects the deployment', () => {
      let error: unknown

      beforeEach(async () => {
        deploy.mockResolvedValueOnce({ status: 400, text: async () => 'Invalid signature' })
        error = await uploadDeployment({ logger }, client, deployData).catch((e) => e)
      })

      it('should reject with the body returned by the server', () => {
        expect(error).toEqual(new Error('Invalid signature'))
      })
    })
  })
})
