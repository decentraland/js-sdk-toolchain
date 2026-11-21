import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { downloadGithubFolder } from '../../../../packages/@dcl/sdk-commands/src/commands/init/download-github-folder'
import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'
import { IFetchComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fetch'

function createResponse(status: number, statusText: string, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(body),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
  } as unknown as Awaited<ReturnType<IFetchComponent['fetch']>>
}

describe('downloadGithubFolder', () => {
  let components: Parameters<typeof downloadGithubFolder>[0]
  let destination: string
  let fetch: jest.MockedFunction<IFetchComponent['fetch']>
  let githubUrl: string

  beforeEach(async () => {
    destination = await mkdtemp(path.join(tmpdir(), 'dcl-github-template-'))
    fetch = jest.fn()
    githubUrl = 'https://github.com/decentraland/example'
    components = { fs: createFsComponent(), fetch: { fetch } }
  })

  afterEach(async () => {
    fetch.mockReset()
    await rm(destination, { recursive: true, force: true })
  })

  describe('when the GitHub contents request fails', () => {
    beforeEach(() => {
      fetch.mockResolvedValueOnce(createResponse(403, 'Forbidden'))
    })

    it('should reject with the failed response status', async () => {
      await expect(downloadGithubFolder(components, githubUrl, destination)).rejects.toThrow('403 Forbidden')
    })
  })

  describe('when a template file request fails', () => {
    beforeEach(() => {
      fetch
        .mockResolvedValueOnce(
          createResponse(200, 'OK', [
            { name: 'package.json', type: 'file', download_url: 'https://example.com/package.json' }
          ])
        )
        .mockResolvedValueOnce(createResponse(404, 'Not Found'))
    })

    it('should reject with the failed file response status', async () => {
      await expect(downloadGithubFolder(components, githubUrl, destination)).rejects.toThrow('404 Not Found')
    })
  })
})
