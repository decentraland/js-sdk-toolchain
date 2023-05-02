import { join, resolve } from 'path'
import { IFileSystemComponent } from '../../packages/@dcl/sdk-commands/src/components/fs'
import {
  b64HashingFunction,
  getPublishableFiles,
  normalizeDecentralandFilename
} from '../../packages/@dcl/sdk-commands/src/logic/project-files'
import { LoadableScene } from '../../packages/@dcl/sdk-runners/src/common/loadable-scene'
import { SceneContext } from '../../packages/@dcl/sdk-runners/src/logic/scene-context'
import { getValidSceneJson } from '../../packages/@dcl/sdk-commands/src/logic/scene-validations'
import { CliComponents } from '../../packages/@dcl/sdk-commands/src/components'

export class MockedRendererScene extends SceneContext {
  constructor(public compiledFileContents: string) {
    super({
      baseUrl: 'http://peer.decentraland.org/content/contents/',
      entity: {
        content: [{ file: 'bin/game.js', hash: '123' }],
        metadata: { main: 'bin/game.js' }
      },
      urn: 'urn:mocked-scene'
    })
  }

  async readFile(file: string): Promise<{ content: Uint8Array; hash: string }> {
    if (file !== 'bin/game.js') throw new Error(`file ${file} not found`)
    return {
      content: new TextEncoder().encode(this.compiledFileContents),
      hash: '123'
    }
  }
  processIncomingMessages(_messages: Uint8Array): void {
    // stub
  }
  physicsPhase(): void {
    // stub
  }
  haltLateUpdateTickZero(): boolean {
    return false
  }
}

export async function mockedSceneFromFolder(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  workingDirectory: string
) {
  const publishableFiles = await getPublishableFiles(components, workingDirectory)
  const sceneJson = await getValidSceneJson(components, workingDirectory)
  const loadableScene: LoadableScene = {
    baseUrl: `https://peer.decentraland.org/content/contents/`,
    entity: {
      content: await Promise.all(
        publishableFiles.map(async (file) => ({
          file: normalizeDecentralandFilename(workingDirectory, file),
          hash: await b64HashingFunction(workingDirectory)
        }))
      ),
      metadata: sceneJson
    },
    urn: `urn:decentraland:entity:${await b64HashingFunction(workingDirectory)}`
  }

  return new MockedLoadableRendererScene(loadableScene, components, workingDirectory)
}

export class MockedLoadableRendererScene extends SceneContext {
  constructor(
    public loadableScene: LoadableScene,
    public components: Pick<CliComponents, 'fs' | 'logger'>,
    public workingDirectory: string
  ) {
    super(loadableScene)
  }

  async readFile(file: string): Promise<{ content: Uint8Array; hash: string }> {
    // maybe too strict?
    if (!this.loadableScene.entity.content.some(($) => $.file === file.toLowerCase()))
      throw new Error(`File ${file} not present in the scene's entity`)

    return {
      content: await this.components.fs.readFile(join(this.workingDirectory, file)),
      hash: await b64HashingFunction(file)
    }
  }
  processIncomingMessages(_messages: Uint8Array): void {
    // stub
  }
  physicsPhase(): void {
    // stub
  }
  haltLateUpdateTickZero(): boolean {
    return false
  }
}
