import { LoadableScene } from '../common/loadable-scene'

export type RunnerContext = BaseRunnerContext & GeneratedRunnerContext

export type BaseRunnerContext = {
  loadableScene: LoadableScene
}

// the following properties are generated based on the parameters of each scene
export type GeneratedRunnerContext = {
  readonly mainCrdtContents: Uint8Array
  readFile(fileName: string): Promise<{ hash: string; content: Uint8Array }>
}
