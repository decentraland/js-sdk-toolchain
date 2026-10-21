import {
  ContentClient,
  PartialDeploymentNotSupportedError,
  PartialDeploymentValidationError
} from '../../../../packages/@dcl/sdk-commands/node_modules/dcl-catalyst-client'
import {
  MAX_SINGLE_REQUEST_BYTES,
  MIN_PARTIAL_DEPLOYMENT_BYTES,
  PARTIAL_BATCH_BYTES,
  PARTIAL_BATCH_CONCURRENCY,
  UploadResult,
  uploadDeployment
} from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/upload'
import { HttpStatusError } from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/utils'
import { CliError } from '../../../../packages/@dcl/sdk-commands/src/logic/error'

type DeploymentData = Parameters<ContentClient['deploy']>[0]

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
    let isContentAvailable: jest.Mock
    let client: ContentClient

    beforeEach(() => {
      deployPartial = jest.fn()
      isContentAvailable = jest.fn()
      client = { deploy, deployPartial, isContentAvailable } as unknown as ContentClient
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
        rejection = new PartialDeploymentValidationError('The partial deployment was rejected: too big', 400)
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
          new PartialDeploymentNotSupportedError('The server does not support partial deployments', 400)
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

        it('should not check which content the server already has', () => {
          expect(isContentAvailable).not.toHaveBeenCalled()
        })
      })

      describe('and the deployment is larger than a single request allows', () => {
        beforeEach(() => {
          deployData = createDeployData(MAX_SINGLE_REQUEST_BYTES, 4)
        })

        describe('and the server is missing too much of its content', () => {
          let error: unknown

          beforeEach(async () => {
            isContentAvailable.mockResolvedValueOnce([
              { cid: 'bafkreicontent0', available: true },
              { cid: 'bafkreicontent1', available: false },
              { cid: 'bafkreicontent2', available: false },
              { cid: 'bafkreicontent3', available: false },
              { cid: 'bafkreientity', available: true }
            ])
            deployData.files.set('bafkreicontent1', { byteLength: MAX_SINGLE_REQUEST_BYTES } as Uint8Array)
            error = await uploadDeployment({ logger }, client, deployData).catch((e) => e)
          })

          it('should check the availability of the content files only', () => {
            expect(isContentAvailable).toHaveBeenCalledWith(
              ['bafkreicontent0', 'bafkreicontent1', 'bafkreicontent2', 'bafkreicontent3'],
              { signal: expect.any(AbortSignal), rejectHttpErrors: true }
            )
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

        describe('and the server already has most of its content', () => {
          let result: UploadResult

          beforeEach(async () => {
            isContentAvailable.mockResolvedValueOnce([
              { cid: 'bafkreicontent0', available: true },
              { cid: 'bafkreicontent1', available: true },
              { cid: 'bafkreicontent2', available: true },
              { cid: 'bafkreicontent3', available: false }
            ])
            deploy.mockResolvedValueOnce({ status: 200, json: async () => ({ message: 'Deployed' }) })
            result = await uploadDeployment({ logger }, client, deployData)
          })

          it('should upload the deployment in a single request', () => {
            expect(deploy).toHaveBeenCalledWith(deployData, { timeout: 600000 })
          })

          it('should resolve with the message of the single request', () => {
            expect(result).toEqual({ message: 'Deployed' })
          })
        })

        describe('and the server fails to tell which content it already has', () => {
          let error: unknown

          beforeEach(async () => {
            isContentAvailable.mockRejectedValueOnce(new HttpStatusError(503))
            error = await uploadDeployment({ logger }, client, deployData).catch((e) => e)
          })

          it('should reject with an error carrying the HTTP status', () => {
            expect(error).toEqual(
              expect.objectContaining({
                constructor: CliError,
                name: 'DEPLOY_CONTENT_CHECK_FAILED',
                message: "Couldn't check which content the server already has (HTTP 503)"
              })
            )
          })

          it('should not upload the deployment in a single request', () => {
            expect(deploy).not.toHaveBeenCalled()
          })
        })

        describe('and it is cancelled while checking which content the server already has', () => {
          let error: unknown

          beforeEach(async () => {
            const controller = new AbortController()
            isContentAvailable.mockImplementationOnce(
              (_hashes, options) =>
                new Promise((_resolve, reject) => {
                  options.signal.addEventListener('abort', () => reject(new Error('This operation was aborted')))
                })
            )
            const uploading = uploadDeployment({ logger }, client, deployData, { signal: controller.signal }).catch(
              (e) => e
            )
            await new Promise((resolve) => setImmediate(resolve))
            controller.abort()
            error = await uploading
          })

          it('should reject with the cancellation instead of a content check error', () => {
            expect(error).toEqual(expect.objectContaining({ name: 'AbortError' }))
          })
        })

        describe('and the server answers which content it has with a malformed response', () => {
          let error: unknown

          beforeEach(async () => {
            isContentAvailable.mockResolvedValueOnce({ error: 'Internal error' })
            error = await uploadDeployment({ logger }, client, deployData).catch((e) => e)
          })

          it('should reject with an error explaining the response was unexpected', () => {
            expect(error).toEqual(
              expect.objectContaining({
                constructor: CliError,
                name: 'DEPLOY_CONTENT_CHECK_FAILED',
                message: "Couldn't check which content the server already has (unexpected response)"
              })
            )
          })
        })

        describe('and the server has all the content but the entity file does not fit', () => {
          let error: unknown

          beforeEach(async () => {
            deployData.files.set('bafkreientity', { byteLength: MAX_SINGLE_REQUEST_BYTES + 1 } as Uint8Array)
            isContentAvailable.mockResolvedValueOnce([
              { cid: 'bafkreicontent0', available: true },
              { cid: 'bafkreicontent1', available: true },
              { cid: 'bafkreicontent2', available: true },
              { cid: 'bafkreicontent3', available: true }
            ])
            error = await uploadDeployment({ logger }, client, deployData).catch((e) => e)
          })

          it('should reject with a DEPLOY_PARTIAL_NOT_SUPPORTED error', () => {
            expect(error).toEqual(expect.objectContaining({ name: 'DEPLOY_PARTIAL_NOT_SUPPORTED' }))
          })
        })
      })
    })
  })

  describe('and the deployment progress is followed', () => {
    let progress: { reportUpload: jest.Mock; reportBatches: jest.Mock }
    let signal: AbortSignal

    beforeEach(() => {
      progress = { reportUpload: jest.fn(), reportBatches: jest.fn() }
      signal = new AbortController().signal
    })

    describe('and it uploads in a single request', () => {
      let client: ContentClient

      beforeEach(async () => {
        client = { deploy } as unknown as ContentClient
        deploy.mockImplementationOnce(async (_data, options) => {
          options.onUploadProgress({ phase: 'uploading', sentBytes: 40, totalBytes: 100 })
          return { status: 200, json: async () => ({}) }
        })
        await uploadDeployment({ logger }, client, deployData, { signal, progress })
      })

      it('should report the upload without batches', () => {
        expect(progress.reportBatches).toHaveBeenCalledWith(null)
      })

      it('should report the bytes sent with the stage of the upload', () => {
        expect(progress.reportUpload).toHaveBeenCalledWith({ stage: 'uploading', sentBytes: 40, totalBytes: 100 })
      })

      it('should hand the cancellation signal to the client', () => {
        expect(deploy).toHaveBeenCalledWith(deployData, expect.objectContaining({ signal }))
      })
    })

    describe('and it uploads in batches', () => {
      let client: ContentClient
      let deployPartial: jest.Mock

      beforeEach(async () => {
        deployPartial = jest.fn()
        client = { deploy, deployPartial } as unknown as ContentClient
        deployData = createDeployData(4 * PARTIAL_BATCH_BYTES, 4)
        deployPartial.mockImplementationOnce(async (_data, options) => {
          options.onUploadProgress({ phase: 'processing', sentBytes: 4e6, totalBytes: 4e6 })
          options.onProgress({ uploadedBytes: 2e6, totalBytes: 4e6, completedBatches: 1, totalBatches: 2 })
          return { creationTimestamp: 1 }
        })
        await uploadDeployment({ logger }, client, deployData, { signal, progress })
      })

      it('should report the batches staged so far, starting with the first one pending', () => {
        expect(progress.reportBatches.mock.calls).toEqual([
          [{ completedBatches: 0, totalBatches: 1 }],
          [{ completedBatches: 1, totalBatches: 2 }]
        ])
      })

      it('should report the bytes sent with the stage of the upload', () => {
        expect(progress.reportUpload).toHaveBeenCalledWith({ stage: 'processing', sentBytes: 4e6, totalBytes: 4e6 })
      })

      it('should hand the cancellation signal to the client', () => {
        expect(deployPartial).toHaveBeenCalledWith(deployData, expect.objectContaining({ signal }))
      })
    })

    describe('and it is cancelled while the server rejects the batches as unsupported', () => {
      let client: ContentClient
      let deployPartial: jest.Mock
      let error: unknown
      let controller: AbortController

      beforeEach(async () => {
        deployPartial = jest.fn()
        client = { deploy, deployPartial } as unknown as ContentClient
        controller = new AbortController()
        deployData = createDeployData(MIN_PARTIAL_DEPLOYMENT_BYTES)
        deployPartial.mockImplementationOnce(async () => {
          controller.abort()
          throw new PartialDeploymentNotSupportedError('The server does not support partial deployments', 400)
        })
        error = await uploadDeployment({ logger }, client, deployData, { signal: controller.signal, progress }).catch(
          (e) => e
        )
      })

      it('should reject with the server error', () => {
        expect(error).toBeInstanceOf(PartialDeploymentNotSupportedError)
      })

      it('should not retry the upload in a single request', () => {
        expect(deploy).not.toHaveBeenCalled()
      })
    })
  })

  describe('and the deployment is below the batching threshold', () => {
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
