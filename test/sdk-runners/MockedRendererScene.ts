import { SceneContext } from '../../packages/@dcl/sdk-runners/src/logic/scene-context'

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
    process.stderr.write('llego process message\n')
    // stub
  }
  physicsPhase(): void {
    process.stderr.write('llego physics phase\n')
    // stub
  }
  haltLateUpdateTickZero(): boolean {
    process.stderr.write('llego haltLateUpdateTickZero\n')
    return false
  }
}
